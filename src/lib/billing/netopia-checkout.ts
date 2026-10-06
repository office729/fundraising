import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { db, type Tx } from "@/lib/db";
import { EroareUtilizator } from "@/lib/erori";
import { raporteazaAvertisment, raporteazaEroare } from "@/lib/monitoring";
import { organizations, platformPayments } from "@/lib/db/schema";
import { clasificaStatus, interogheazaStatus, netopiaConfigurata, pornestePlata, taxeazaCuTokenSalvat, type DateFacturare } from "@/lib/netopia";
import { decripteaza } from "@/lib/secret-box";

import { REFERRAL_DISCOUNT_PERCENT } from "../referral";
import { dateFacturareComplete, MESAJ_DATE_FACTURARE_LIPSA } from "./date-facturare";
import type { CustomPlanConfigSaved } from "./custom-plan";
import { proceseazaRezultatPlataNetopia, type ConfirmareNetopia } from "./netopia-confirm";
import type { OrgPackage } from "./packages";

type ParametriComanda = {
  orgId: string;
  orgReferredByOrgId: string | null;
  pachet: Exclude<OrgPackage, "trial">;
  pretLunar: number;
  planConfig: CustomPlanConfigSaved | null;
  renewal: boolean;
};

// Inserează rândul platform_payments — comun fluxului interactiv (card nou, pe
// pagina găzduită) și celui automat (reînnoire cu cardul salvat, vezi
// api/cron/netopia-reinnoire). NU modifică pachetul sau starea organizației —
// accesul se acordă doar la confirmare (proceseazaRezultatPlataNetopia).
//
// Reducerea de recomandare se aplică DOAR la prima plată reușită a
// organizației, o singură dată — recalculată aici, server-side. Lock
// consultativ pe organizație, ținut până la sfârșitul TRANZACȚIEI primite ca
// parametru: altfel două comenzi concurente (dublu-click, sau un click manual
// chiar când rulează cronul de reînnoire) ar putea reclama amândouă reducerea.
// O reînnoire automată nu o revendică niciodată în practică — la momentul ei
// organizația are deja cel puțin o plată reușită (prima), deci `platite > 0`.
async function insereazaComandaAbonament(tx: Tx, p: ParametriComanda): Promise<{ orderId: string; sumaLei: number }> {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`plata_abonament:${p.orgId}`}))`);

  const [{ platite, inCurs }] = await tx
    .select({
      platite: sql<number>`count(*) filter (where ${platformPayments.status} = 'reusita')`.mapWith(Number),
      inCurs: sql<number>`count(*) filter (where ${platformPayments.status} = 'in_asteptare' and ${platformPayments.createdAt} > now() - interval '30 minutes')`.mapWith(Number),
    })
    .from(platformPayments)
    .where(eq(platformPayments.orgId, p.orgId));
  const areDreptulLaReducere = Boolean(p.orgReferredByOrgId) && platite === 0 && inCurs === 0;
  const sumaLei = areDreptulLaReducere ? Math.round((p.pretLunar * (100 - REFERRAL_DISCOUNT_PERCENT)) / 100) : p.pretLunar;

  const orderId = `fa_${randomUUID().replace(/-/g, "")}`;
  await tx.insert(platformPayments).values({ orgId: p.orgId, orderId, package: p.pachet, sumaLei, luni: 1, planConfig: p.planConfig, renewal: p.renewal });
  return { orderId, sumaLei };
}

// Salvează ntpID-ul întors de Netopia la pornirea plății — necesar pentru
// interogheazaStatus() (fallback dacă IPN-ul întârzie/nu ajunge, vezi
// rezultat/data.ts). Rulează cu context de încredere (app.public_lookup), NU
// prin ctx.db al membrului: membrii au drept doar de INSERT/SELECT pe
// platform_payments, niciodată UPDATE — statusul plății rămâne exclusiv sub
// controlul funcțiilor de încredere (proceseazaRezultatPlataNetopia și,
// acum, această scriere strict a ntpID-ului, o valoare de corelare, nu de bani).
async function salveazaNtpId(orderId: string, ntpId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    await tx
      .update(platformPayments)
      .set({ ntpId })
      .where(and(eq(platformPayments.orderId, orderId), sql`${platformPayments.ntpId} is null`));
  });
}

async function marcheazaComandaEsuata(orderId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    await tx
      .update(platformPayments)
      .set({ status: "esuata" })
      .where(and(eq(platformPayments.orderId, orderId), eq(platformPayments.status, "in_asteptare")));
  });
}

// Pornește plata (o lună de acces) prin Netopia și întoarce URL-ul paginii lor
// de plată — clientul redirecționează la URL-ul întors. Dacă Netopia refuză
// pornirea, eroarea se propagă și tranzacția organizației (inclusiv comanda de
// mai sus) se anulează — nu rămâne nicio comandă-fantomă.
export async function creeazaPlataAbonament(
  ctx: OrgContext,
  params: {
    pachet: Exclude<OrgPackage, "trial">;
    pretLunar: number;
    packageLabel: string;
    planConfig: CustomPlanConfigSaved | null;
    origin: string;
  },
): Promise<string> {
  if (!netopiaConfigurata()) throw new Error("netopia_neconfigurat");
  // Aplicat AICI (nu doar în interfață): fără CIF/adresă, factura Oblio ar pleca
  // pe „persoană fizică". Reînnoirile automate nu trec pe aici — au deja prima plată.
  if (!dateFacturareComplete({ cif: ctx.orgCif, adresaSediu: ctx.orgAdresaSediu, judet: ctx.orgJudet })) {
    throw new EroareUtilizator(MESAJ_DATE_FACTURARE_LIPSA);
  }

  // Comanda se scrie într-o tranzacție SCURTĂ, separată și comisă imediat (cu context de încredere), nu în tranzacția
  // organizației: altfel `salveazaNtpId` (alt rând de conexiune) nu vedea rândul necomis, actualiza 0 rânduri și
  // fallback-ul de status (pentru IPN întârziat) nu putea funcționa niciodată.
  const { orderId, sumaLei } = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return insereazaComandaAbonament(tx, {
      orgId: ctx.orgId,
      orgReferredByOrgId: ctx.orgReferredByOrgId,
      pachet: params.pachet,
      pretLunar: params.pretLunar,
      planConfig: params.planConfig,
      renewal: false,
    });
  });

  const [prenume, ...restNume] = (ctx.userName ?? "").trim().split(/\s+/).filter(Boolean);

  let paymentUrl: string;
  let ntpId: string | null;
  try {
    ({ paymentUrl, ntpId } = await pornestePlata({
      orderId,
      sumaLei,
      descriere: `Alexandrit — ${params.packageLabel} (o lună)`,
      facturare: {
        email: ctx.userEmail,
        prenume: prenume ?? "Client",
        nume: restNume.join(" ") || ctx.orgName.slice(0, 60),
        // Nu colectăm încă un telefon al plătitorului; Netopia îl cere obligatoriu.
        telefon: "0700000000",
      },
      notifyUrl: `${params.origin}/api/netopia/ipn`,
      redirectUrl: `${params.origin}/abonament/${ctx.orgSlug}/rezultat?comanda=${orderId}`,
      cancelUrl: `${params.origin}/${ctx.orgSlug}/setari`,
    }));
  } catch (e) {
    // Netopia a refuzat pornirea: comanda nu mai e anulată odată cu tranzacția organizației (e deja comisă) — o închidem noi.
    await marcheazaComandaEsuata(orderId).catch((err) => raporteazaEroare("netopia-comanda-esuata", err, { orderId }));
    throw e;
  }
  // Best-effort — o eroare aici nu trebuie să blocheze redirectul spre plată;
  // fără ntpID salvat, fallback-ul de status de pe pagina de rezultat pur și
  // simplu nu se poate folosi pentru această comandă (rămâne doar IPN-ul).
  if (ntpId) await salveazaNtpId(orderId, ntpId).catch((e) => console.error("Netopia: salvare ntpID eșuată", e));
  return paymentUrl;
}

export type RezultatReinnoire =
  | { ok: true; confirmare: ConfirmareNetopia }
  | { ok: false; motiv: "fara_card" | "criptare_indisponibila" | "eroare" | "comanda_in_curs" | "deja_reinnoit" };

// O taxare cu token căzută după ce Netopia a încasat (timeout, răspuns pierdut)
// lasă comanda `in_asteptare`; fără verificare, rularea de a doua zi ar taxa a
// doua oară același card. Interogăm statusul comenzilor de reînnoire nelămurite
// (ultimele 72h) și, dacă una s-a decis, o confirmăm pe ea în loc să mai taxăm.
async function verificaComenziInCurs(orgId: string): Promise<ConfirmareNetopia | null> {
  const pending = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx
      .select({ orderId: platformPayments.orderId, ntpId: platformPayments.ntpId })
      .from(platformPayments)
      .where(
        and(
          eq(platformPayments.orgId, orgId),
          eq(platformPayments.renewal, true),
          eq(platformPayments.status, "in_asteptare"),
          sql`${platformPayments.createdAt} > now() - interval '72 hours'`,
        ),
      );
  });
  for (const p of pending) {
    if (!p.ntpId) continue;
    try {
      const rezultat = await interogheazaStatus({ orderId: p.orderId, ntpId: p.ntpId });
      if (rezultat && clasificaStatus(rezultat.status) !== "in_asteptare") {
        return await proceseazaRezultatPlataNetopia(p.orderId, rezultat);
      }
    } catch (e) {
      raporteazaEroare("netopia-reinnoire-verificare", e, { orgId, orderId: p.orderId });
    }
  }
  return null;
}

// Reînnoire AUTOMATĂ (cron zilnic, vezi api/cron/netopia-reinnoire) — taxează
// direct cardul salvat al organizației, fără pagină găzduită și fără
// redirect (nimeni nu e prezent să confirme). Aceleași reguli de preț ca la
// plata interactivă (recalculat din pachet/planConfig, niciodată dintr-o sumă
// reținută la prima plată — un ONG care își schimbă planul între timp e taxat
// corect la reînnoire).
export async function taxeazaReinnoireAutomata(
  org: {
    id: string;
    slug: string;
    name: string;
    referredByOrgId: string | null;
    package: Exclude<OrgPackage, "trial">;
    pretLunar: number;
    packageLabel: string;
    planConfig: CustomPlanConfigSaved | null;
    netopiaCardTokenEnc: string | null;
    facturareEmail: string;
  },
  baseUrl: string,
): Promise<RezultatReinnoire> {
  if (!org.netopiaCardTokenEnc) return { ok: false, motiv: "fara_card" };

  let token: string;
  try {
    token = decripteaza(org.netopiaCardTokenEnc);
  } catch {
    return { ok: false, motiv: "criptare_indisponibila" };
  }

  // Tranzacție SCURTĂ, doar pentru inserarea comenzii — se închide înainte de
  // apelul de rețea către Netopia de mai jos (o conexiune Postgres ținută
  // deschisă cât durează un apel HTTP extern e exact ce am evitat și la
  // fluxul interactiv, unde apelul rămâne azi în tranzacția lui withOrgAdmin
  // doar pentru că acolo pornește dintr-o acțiune de server existentă — aici,
  // pornind de la zero într-un cron, îl facem corect de la început).
  const deciza = await verificaComenziInCurs(org.id);
  if (deciza) return { ok: true, confirmare: deciza };

  const comanda = await db.transaction(async (tx: Tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    // Același lock ca în insereazaComandaAbonament (reentrant în aceeași
    // tranzacție): două rulări suprapuse ale cron-ului se serializează aici, iar
    // a doua vede comanda abia creată de prima și nu mai taxează. O comandă
    // nelămurită mai tânără de 36h (fără ntpID de verificat, sau încă în curs)
    // blochează o nouă taxare — IPN-ul are timp să sosească.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`plata_abonament:${org.id}`}))`);
    const [{ nelamurite }] = await tx
      .select({ nelamurite: sql<number>`count(*)`.mapWith(Number) })
      .from(platformPayments)
      .where(
        and(
          eq(platformPayments.orgId, org.id),
          eq(platformPayments.renewal, true),
          eq(platformPayments.status, "in_asteptare"),
          sql`${platformPayments.createdAt} > now() - interval '72 hours'`,
        ),
      );
    if (nelamurite > 0) return "in_curs" as const;
    // Re-verificare SUB lock: lista de organizații a cron-ului s-a citit la început; între timp altă rulare (sau o plată
    // manuală) a putut prelungi deja perioada — fără asta, a doua rulare taxa a doua oară același card.
    const [stare] = await tx
      .select({ autoRenew: organizations.netopiaAutoRenew, sfarsit: organizations.currentPeriodEnd })
      .from(organizations)
      .where(eq(organizations.id, org.id))
      .limit(1);
    if (!stare?.autoRenew) return "deja_reinnoit" as const;
    if (stare.sfarsit && stare.sfarsit.getTime() > Date.now() + 86_400_000) return "deja_reinnoit" as const;
    return insereazaComandaAbonament(tx, {
      orgId: org.id,
      orgReferredByOrgId: org.referredByOrgId,
      pachet: org.package,
      pretLunar: org.pretLunar,
      planConfig: org.planConfig,
      renewal: true,
    });
  });
  if (comanda === "deja_reinnoit") return { ok: false, motiv: "deja_reinnoit" };
  if (comanda === "in_curs" || !comanda) {
    // O comandă nelămurită (răspuns pierdut, fără IPN) blochează retaxarea 72h, ca să nu taxăm de două ori: cere verificare manuală.
    raporteazaAvertisment("netopia-reinnoire", "taxare blocată: există o comandă de reînnoire nelămurită (verifică în Netopia)", { orgSlug: org.slug });
    return { ok: false, motiv: "comanda_in_curs" };
  }
  const { orderId, sumaLei } = comanda;

  const facturare: DateFacturare = {
    email: org.facturareEmail,
    prenume: "Client",
    nume: org.name.slice(0, 60),
    telefon: "0700000000",
  };

  try {
    const rezultat = await taxeazaCuTokenSalvat({
      orderId,
      sumaLei,
      descriere: `Alexandrit — ${org.packageLabel} (reînnoire automată)`,
      facturare,
      notifyUrl: `${baseUrl}/api/netopia/ipn`,
      redirectUrl: `${baseUrl}/abonament/${org.slug}/rezultat?comanda=${orderId}`,
      token,
    });
    const confirmare = await proceseazaRezultatPlataNetopia(orderId, rezultat);
    return { ok: true, confirmare };
  } catch (e) {
    // Cauza (timeout, Netopia căzut, răspuns pierdut) se pierdea complet; comanda rămâne „în așteptare" și blochează retaxarea.
    raporteazaEroare("netopia-reinnoire-taxare", e, { orgSlug: org.slug, orderId });
    return { ok: false, motiv: "eroare" };
  }
}
