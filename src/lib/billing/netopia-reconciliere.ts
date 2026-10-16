import "server-only";

import { and, asc, eq, isNotNull, isNull, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { platformPayments } from "@/lib/db/schema";
import { raporteazaAvertisment, raporteazaEroare } from "@/lib/monitoring";
import { clasificaStatus, interogheazaStatus } from "@/lib/netopia";

import { proceseazaRezultatPlataNetopia } from "./netopia-confirm";

// Plățile de abonament ajung confirmate prin IPN (verificat) sau, la deschiderea paginii de rezultat, prin interogarea activă a statusului.
// Dacă IPN-ul se pierde ȘI clientul închide fila imediat după plată, nimic nu mai verifica comanda: cardul era taxat, iar organizația rămânea
// fără acces, fără factură și fără nicio alertă. Reconcilierea de mai jos rulează în cronul zilnic (vezi api/cron/netopia-reinnoire) și:
//  1. interoghează statusul comenzilor „în așteptare” care au ntpID (mai vechi de 10 minute, ca IPN-ul să aibă timp să sosească, și mai noi
//     de 14 zile) și le confirmă prin ACEEAȘI funcție ca IPN-ul (idempotentă);
//  2. închide ca „anulata” comenzile interactive abandonate (pagina de plată Netopia expiră; peste 14 zile nu se mai poate plăti) — altfel
//     tabelul ar crește la nesfârșit; reînnoirile automate nelămurite NU se ating aici (blochează retaxarea până le lămurește un om);
//  3. avertizează pentru comenzile interactive fără ntpID mai vechi de 2 ore (nu pot fi verificate: dacă IPN-ul nu vine, rămân neștiute).
// Limită de timp: cronul are o durată maximă fixă, iar fiecare interogare poate dura până la 30 s.

const MIN_VARSTA_MIN = 10;
const MAX_VARSTA_ZILE = 14;
const LIMITA_VERIFICARI = 25;
const LIMITA_CURATENIE = 50;
// O reînnoire automată rămasă „în așteptare” (de ex. status 15, „autentificare 3-D Secure întreruptă”: banca cere clientului o confirmare pe care
// o taxare fără client nu o poate da) nu se rezolvă singură și, prin regula „comandă nelămurită blochează retaxarea”, ținea abonamentul blocat
// la nesfârșit, fără niciun semn pentru client. După acest prag se închide ca eșuată (se numără ca încercare, iar clientul e anunțat).
const PRAG_REINNOIRE_BLOCATA_ORE = 6;
// „Respinsă” în clasificarea Netopia (vezi clasificaStatus): singura stare finală de eșec care nu rescrie altceva.
const STATUS_INCHIS_CA_ESUAT = 12;

export type RezultatReconciliere = {
  verificate: number;
  recuperate: number; // plăți reușite confirmate DOAR prin reconciliere (IPN lipsă)
  esuate: number;
  rambursate: number;
  anulate: number;
  // Reînnoiri nefinalizate închise ca eșuate; cronul anunță clienții (vezi api/cron/netopia-reinnoire).
  reinnoiriInchise: { orgId: string; reinnoireDezactivata: boolean }[];
  faraNtpId: number;
  intrerupt: boolean;
};

export async function reconcilieazaComenziInAsteptare(opts: { bugetMs?: number } = {}): Promise<RezultatReconciliere> {
  const limita = Date.now() + (opts.bugetMs ?? 90_000);
  const rez: RezultatReconciliere = { verificate: 0, recuperate: 0, esuate: 0, rambursate: 0, anulate: 0, reinnoiriInchise: [], faraNtpId: 0, intrerupt: false };

  const candidate = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx
      .select({ orderId: platformPayments.orderId, ntpId: platformPayments.ntpId, orgId: platformPayments.orgId, renewal: platformPayments.renewal, createdAt: platformPayments.createdAt })
      .from(platformPayments)
      .where(
        and(
          eq(platformPayments.status, "in_asteptare"),
          isNotNull(platformPayments.ntpId),
          sql`${platformPayments.createdAt} < now() - make_interval(mins => ${MIN_VARSTA_MIN})`,
          sql`${platformPayments.createdAt} > now() - make_interval(days => ${MAX_VARSTA_ZILE})`,
        ),
      )
      .orderBy(asc(platformPayments.createdAt))
      .limit(LIMITA_VERIFICARI);
  });

  for (const c of candidate) {
    if (Date.now() > limita) {
      rez.intrerupt = true;
      break;
    }
    if (!c.ntpId) continue;
    rez.verificate++;
    try {
      const rezultat = await interogheazaStatus({ orderId: c.orderId, ntpId: c.ntpId });
      if (!rezultat) continue;
      if (clasificaStatus(rezultat.status) === "in_asteptare") {
        if (c.renewal && Date.now() - c.createdAt.getTime() > PRAG_REINNOIRE_BLOCATA_ORE * 3600_000) {
          const inchisa = await proceseazaRezultatPlataNetopia(c.orderId, { ...rezultat, status: STATUS_INCHIS_CA_ESUAT });
          raporteazaAvertisment("netopia-reconciliere", "reînnoire automată nefinalizată (de obicei autentificare cerută de bancă): închisă ca eșuată, clientul e anunțat", {
            orderId: c.orderId,
            orgId: c.orgId,
            statusNetopia: rezultat.status,
          });
          if (inchisa.actiune === "esuata") {
            rez.esuate++;
            rez.reinnoiriInchise.push({ orgId: inchisa.orgId, reinnoireDezactivata: inchisa.reinnoireDezactivata });
          }
        }
        continue;
      }
      const confirmare = await proceseazaRezultatPlataNetopia(c.orderId, rezultat);
      if (confirmare.actiune === "reusita") {
        rez.recuperate++;
        // IPN-ul nu a ajuns: cardul NU a putut fi salvat pentru reînnoire automată (tokenul vine doar în IPN) — de știut la suport.
        raporteazaAvertisment("netopia-reconciliere", "plată confirmată prin reconciliere (IPN lipsă); cardul nu a fost salvat pentru reînnoire automată", {
          orderId: c.orderId,
          orgId: c.orgId,
        });
      } else if (confirmare.actiune === "esuata") rez.esuate++;
      else if (confirmare.actiune === "rambursata") rez.rambursate++;
    } catch (e) {
      raporteazaEroare("netopia-reconciliere", e, { orderId: c.orderId });
    }
  }

  // 2. Curățenie: comenzi interactive abandonate (mai vechi de 14 zile).
  const vechi = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx
      .select({ orderId: platformPayments.orderId, ntpId: platformPayments.ntpId })
      .from(platformPayments)
      .where(
        and(
          eq(platformPayments.status, "in_asteptare"),
          eq(platformPayments.renewal, false),
          lt(platformPayments.createdAt, sql`now() - make_interval(days => ${MAX_VARSTA_ZILE})`),
        ),
      )
      .orderBy(asc(platformPayments.createdAt))
      .limit(LIMITA_CURATENIE);
  });
  for (const v of vechi) {
    if (Date.now() > limita) {
      rez.intrerupt = true;
      break;
    }
    // O ultimă verificare înainte de a închide: dacă Netopia o știe plătită, o confirmăm în loc să o anulăm.
    if (v.ntpId) {
      try {
        const rezultat = await interogheazaStatus({ orderId: v.orderId, ntpId: v.ntpId });
        if (rezultat && clasificaStatus(rezultat.status) !== "in_asteptare") {
          const confirmare = await proceseazaRezultatPlataNetopia(v.orderId, rezultat);
          if (confirmare.actiune === "reusita") rez.recuperate++;
          continue;
        }
      } catch (e) {
        raporteazaEroare("netopia-reconciliere", e, { orderId: v.orderId });
        continue; // nu putem verifica: nu închidem pe orb
      }
    }
    await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
      await tx
        .update(platformPayments)
        .set({ status: "anulata" })
        .where(and(eq(platformPayments.orderId, v.orderId), eq(platformPayments.status, "in_asteptare")));
    });
    rez.anulate++;
  }

  // 3. Comenzi interactive fără ntpID, mai vechi de 2 ore și mai noi de 14 zile: nu se pot verifica.
  const [{ n }] = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx
      .select({ n: sql<number>`count(*)`.mapWith(Number) })
      .from(platformPayments)
      .where(
        and(
          eq(platformPayments.status, "in_asteptare"),
          eq(platformPayments.renewal, false),
          isNull(platformPayments.ntpId),
          sql`${platformPayments.createdAt} < now() - interval '2 hours'`,
          sql`${platformPayments.createdAt} > now() - make_interval(days => ${MAX_VARSTA_ZILE})`,
        ),
      );
  });
  rez.faraNtpId = n;
  if (n > 0) {
    raporteazaAvertisment("netopia-reconciliere", "comenzi de abonament în așteptare fără ntpID (nu pot fi verificate la Netopia; depind de IPN)", { numar: n });
  }

  return rez;
}
