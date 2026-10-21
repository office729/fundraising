import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, or, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { db, type Tx } from "@/lib/db";
import { EroareUtilizator } from "@/lib/erori";
import { raporteazaAvertisment, raporteazaEroare } from "@/lib/monitoring";
import { organizations, platformPayments } from "@/lib/db/schema";
import { clasificaStatus, interogheazaStatus, netopiaConfigurata, pornestePlata, taxeazaCuTokenSalvat, type DateFacturare } from "@/lib/netopia";
import { decripteaza } from "@/lib/secret-box";

import { alertaOperatorZilnic } from "./alerta-operator";
import { dateAntifraud, MESAJ_TELEFON_LIPSA } from "./date-antifraud";
import { pretDeTest } from "./pret-test";
import { isPlatformAdmin } from "./trial";
import { NetopiaRespins } from "./netopia-erori";

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
  extraUtilizatori: number;
  // Luni de acces acoperite de plată (1 = lunar, 12 = anual); `pretLunar` de mai jos e deja prețul întregii perioade.
  luni: number;
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
  await tx.insert(platformPayments).values({ orgId: p.orgId, orderId, package: p.pachet, sumaLei, luni: p.luni, planConfig: p.planConfig, extraUsers: p.extraUtilizatori, renewal: p.renewal });
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
    // Utilizatori plătiți în plus peste START; 0 pentru celelalte pachete. Prețul din `pretLunar` îi include deja.
    extraUtilizatori?: number;
    // 12 pentru plata anuală (10 luni plătite); `pretLunar` primit e atunci prețul pe an.
    luni?: number;
    origin: string;
  },
): Promise<string> {
  if (!netopiaConfigurata()) throw new Error("netopia_neconfigurat");
  // Aplicat AICI (nu doar în interfață): fără CIF/adresă, factura Oblio ar pleca
  // pe „persoană fizică". Reînnoirile automate nu trec pe aici — au deja prima plată.
  if (!dateFacturareComplete({ cif: ctx.orgCif, adresaSediu: ctx.orgAdresaSediu, judet: ctx.orgJudet })) {
    throw new EroareUtilizator(MESAJ_DATE_FACTURARE_LIPSA);
  }

  // Telefonul organizației (completat la înscriere) — nu e în contextul de sesiune, deci îl citim aici. Obligatoriu la plata interactivă și verificat
  // ÎNAINTE de a crea comanda: altfel ar rămâne o comandă „în așteptare” pentru o plată care nu pornește.
  const [orgTel] = await ctx.db.select({ telefon: organizations.telefon }).from(organizations).where(eq(organizations.id, ctx.orgId)).limit(1);
  const antifraud = dateAntifraud({
    numeUtilizator: ctx.userName,
    orgName: ctx.orgName,
    telefon: orgTel?.telefon,
    adresaSediu: ctx.orgAdresaSediu,
    judet: ctx.orgJudet,
  });
  if (!antifraud.telefonReal) throw new EroareUtilizator(MESAJ_TELEFON_LIPSA);

  // Comanda se scrie într-o tranzacție SCURTĂ, separată și comisă imediat (cu context de încredere), nu în tranzacția
  // organizației: altfel `salveazaNtpId` (alt rând de conexiune) nu vedea rândul necomis, actualiza 0 rânduri și
  // fallback-ul de status (pentru IPN întârziat) nu putea funcționa niciodată.
  // Preț de test (vezi pret-test.ts): doar organizația țintă din variabilele de mediu, cu plafon; vizibil în Sentry cât e activ.
  // Doar conturile administratorilor platformei: slug-ul „test” nu e rezervat, deci un client care ajunge să-l aibă nu primește prețul de test.
  const pretTest = isPlatformAdmin(ctx.userEmail) ? pretDeTest(ctx.orgSlug) : null;
  if (pretTest !== null) raporteazaAvertisment("netopia-test", "PREȚ DE TEST aplicat plății de abonament", { orgSlug: ctx.orgSlug, sumaLei: pretTest });
  const { orderId, sumaLei } = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return insereazaComandaAbonament(tx, {
      orgId: ctx.orgId,
      orgReferredByOrgId: ctx.orgReferredByOrgId,
      pachet: params.pachet,
      pretLunar: pretTest ?? params.pretLunar,
      planConfig: params.planConfig,
      extraUtilizatori: params.extraUtilizatori ?? 0,
      luni: params.luni ?? 1,
      renewal: false,
    });
  });

  let paymentUrl: string;
  let ntpId: string | null;
  try {
    ({ paymentUrl, ntpId } = await pornestePlata({
      orderId,
      sumaLei,
      descriere: `Alexandrit — ${params.packageLabel} (${(params.luni ?? 1) === 12 ? "un an" : "o lună"})`,
      facturare: {
        email: ctx.userEmail,
        prenume: antifraud.prenume,
        nume: antifraud.nume,
        telefon: antifraud.telefon,
        oras: antifraud.oras,
        judet: antifraud.judet,
        adresa: antifraud.adresa,
      },
      notifyUrl: `${params.origin}/api/netopia/ipn`,
      redirectUrl: `${params.origin}/abonament/${ctx.orgSlug}/rezultat?comanda=${orderId}`,
      cancelUrl: `${params.origin}/${ctx.orgSlug}/crm/setari`,
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
// (de ORICE vârstă — o comandă nelămurită nu „expiră", vezi blocarea de mai jos) și, dacă una s-a decis, o confirmăm pe ea în loc
// să mai taxăm.
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
        ),
      )
      .limit(20);
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
    extraUtilizatori: number;
    // 1 = lunar, 12 = anual; `pretLunar` e prețul pe perioada respectivă.
    luni: number;
    netopiaCardTokenEnc: string | null;
    facturareEmail: string;
    // Date reale pentru antifraud (vezi date-antifraud.ts); lipsesc doar la apelanți vechi.
    facturareNume?: string | null;
    telefon?: string | null;
    adresaSediu?: string | null;
    judet?: string | null;
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
    // a doua vede comanda abia creată de prima și nu mai taxează. O comandă de reînnoire nelămurită (fără ntpID de verificat, sau încă în
    // curs) blochează orice nouă taxare, ORICÂT de veche ar fi: o limită de timp ar fi retaxat același card după ce IPN-ul nu a mai
    // sosit, deși Netopia încasase prima dată. Se deblochează doar când comanda se lămurește (IPN târziu, verificare de status, respingere
    // sigură) sau o rezolvă un om (vezi documentation/reinnoire-comanda-nelamurita.md). Tot așa, o plată interactivă pornită în ultimele
    // 30 de minute (clientul e chiar acum în pagina de plată) amână taxarea automată.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`plata_abonament:${org.id}`}))`);
    const [{ nelamurite }] = await tx
      .select({ nelamurite: sql<number>`count(*)`.mapWith(Number) })
      .from(platformPayments)
      .where(
        and(
          eq(platformPayments.orgId, org.id),
          eq(platformPayments.status, "in_asteptare"),
          or(eq(platformPayments.renewal, true), sql`${platformPayments.createdAt} > now() - interval '30 minutes'`),
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
      extraUtilizatori: org.extraUtilizatori,
      luni: org.luni,
      renewal: true,
    });
  });
  if (comanda === "deja_reinnoit") return { ok: false, motiv: "deja_reinnoit" };
  if (comanda === "in_curs" || !comanda) {
    // O comandă nelămurită (răspuns pierdut, fără IPN) blochează retaxarea până se lămurește, ca să nu taxăm de două ori: cere verificare
    // manuală în Netopia. Alertă pe email o dată pe zi, ca să nu rămână doar în Sentry.
    raporteazaAvertisment("netopia-reinnoire", "taxare blocată: există o comandă de reînnoire nelămurită (verifică în Netopia)", { orgSlug: org.slug });
    await alertaOperatorZilnic(
      `reinnoire-nelamurita:${org.id}`,
      `Reînnoire blocată — comandă nelămurită (${org.name})`,
      `<p>Reînnoirea automată a organizației <strong>${org.name.replace(/[<>&]/g, "")}</strong> (${org.slug}) este <strong>blocată</strong> pentru că are o comandă de reînnoire „în așteptare" a cărei plată nu s-a lămurit (răspuns pierdut sau IPN neprimit).</p><p>Verifică în panoul Netopia dacă plata a fost încasată și rezolvă comanda conform <code>documentation/reinnoire-comanda-nelamurita.md</code>. Până atunci nu se mai taxează cardul, ca să nu se încaseze de două ori.</p>`,
    );
    return { ok: false, motiv: "comanda_in_curs" };
  }
  const { orderId, sumaLei } = comanda;

  const antifraud = dateAntifraud({ numeUtilizator: org.facturareNume, orgName: org.name, telefon: org.telefon, adresaSediu: org.adresaSediu, judet: org.judet });
  if (!antifraud.telefonReal) raporteazaAvertisment("netopia-antifraud", "organizația nu are un telefon valid: se trimite telefonul implicit", { orgSlug: org.slug });
  const facturare: DateFacturare = {
    email: org.facturareEmail,
    prenume: antifraud.prenume,
    nume: antifraud.nume,
    telefon: antifraud.telefon,
    oras: antifraud.oras,
    judet: antifraud.judet,
    adresa: antifraud.adresa,
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
    raporteazaEroare("netopia-reinnoire-taxare", e, { orgSlug: org.slug, orderId });
    if (e instanceof NetopiaRespins) {
      // Netopia a respins cererea (nimic procesat): comanda se închide ca eșuată, ca să NU blocheze reînnoirea de mâine.
      await db.transaction(async (tx: Tx) => {
        await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
        await tx
          .update(platformPayments)
          .set({ status: "esuata" })
          .where(and(eq(platformPayments.orderId, orderId), eq(platformPayments.status, "in_asteptare")));
      });
    }
    // Orice altă cauză (timeout, Netopia căzut, răspuns pierdut): rezultat NECUNOSCUT — comanda rămâne „în așteptare" și blochează retaxarea.
    return { ok: false, motiv: "eroare" };
  }
}
