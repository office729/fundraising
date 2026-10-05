import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { NETOPIA_RENEWAL_MAX_INCERCARI, reiaFacturileNeemise } from "@/lib/billing/netopia-confirm";
import { taxeazaReinnoireAutomata } from "@/lib/billing/netopia-checkout";
import { dateFacturareComplete } from "@/lib/billing/date-facturare";
import { NUME_PACHET_FIX, PACKAGE_LIMITS, type OrgPackage } from "@/lib/billing/packages";
import type { CustomPlanConfigSaved } from "@/lib/billing/custom-plan";
import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { appUsers, memberships, organizations } from "@/lib/db/schema";
import { emailConfigurat, trimiteEmail } from "@/lib/email";
import { netopiaConfigurata } from "@/lib/netopia";
import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import {
  htmlAvizReinnoire,
  htmlCardExpirat,
  htmlDateFacturareLipsa,
  htmlReinnoireEsuata,
  subiectAvizReinnoire,
  subiectCardExpirat,
  subiectDateFacturareLipsa,
  subiectReinnoireEsuata,
} from "@/lib/netopia-renewal-email-template";
import { raporteazaAvertisment, raporteazaEroare } from "@/lib/monitoring";

// Rulat zilnic de Vercel Cron (vezi vercel.json) — taxează AUTOMAT organizațiile
// care au reînnoirea activă (card salvat, vezi organizations.netopia_auto_renew)
// și a căror perioadă plătită se apropie de sfârșit sau a trecut deja (reîncercare
// zilnică, până la NETOPIA_RENEWAL_MAX_INCERCARI eșecuri consecutive).
//
// O singură condiție acoperă ambele cazuri (reînnoire la timp + reîncercare după
// eșec): currentPeriodEnd <= mâine. La succes, perioada se prelungește cu o lună
// (proceseazaRezultatPlataNetopia), deci organizația iese singură din fereastră
// pentru rulările următoare. La eșec, perioada NU se schimbă, deci rămâne în
// fereastră și e reîncercată — până când fie reușește, fie atinge pragul de
// eșecuri și reînnoirea automată se dezactivează (organizations.netopia_auto_renew).
//
// Card expirat? Un card e valabil până la sfârșitul lunii de expirare. Anul poate veni pe 2 cifre.
function cardExpiratLa(luna: number | null, an: number | null, data: Date): boolean {
  if (!luna || !an) return false;
  const anComplet = an < 100 ? 2000 + an : an;
  const y = data.getUTCFullYear();
  const m = data.getUTCMonth() + 1;
  return anComplet < y || (anComplet === y && luna < m);
}

function pretSiEticheta(org: { package: string; customPlanConfig: unknown }): { pret: number; eticheta: string } | null {
  const pret =
    org.package === "custom"
      ? (org.customPlanConfig as CustomPlanConfigSaved | null)?.pretLunar
      : PACKAGE_LIMITS[org.package as Exclude<OrgPackage, "trial" | "custom">]?.pretLunar;
  if (!pret) return null;
  const eticheta = org.package === "custom" ? "Plan personalizat" : NUME_PACHET_FIX[org.package as Exclude<OrgPackage, "trial" | "custom">];
  return { pret, eticheta };
}

function formatData(d: Date): string {
  return d.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Bucharest" });
}

// NU trece prin withOrgAdmin (nu există o sesiune de user aici) — fiecare
// organizație e procesată separat, cu contextul de încredere app.public_lookup,
// la fel ca celelalte cron-uri/webhook-uri.

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  }
  if (!cronAutorizat(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Reluarea facturilor rămase neemise — independentă de reînnoiri (rulează și
  // când nu e nimic de taxat sau Netopia nu e configurat).
  const facturi = await reiaFacturileNeemise().catch((e) => {
    raporteazaEroare("oblio-factura-reluare", e);
    return { incercate: 0, emise: 0 };
  });

  // Curățenie: contoarele de rată cu fereastra veche de peste 14 zile (deduplicarea avizelor de reînnoire folosește aceeași tabelă) nu mai au rost (tabelul ar crește
  // nelimitat — fiecare IP/email/cheie nouă adaugă un rând). Best-effort.
  await db.execute(sql`delete from auth_rate_limits where fereastra_start < now() - interval '14 days'`).catch((e) =>
    raporteazaEroare("rate-limit-curatenie", e),
  );

  if (!netopiaConfigurata()) {
    return NextResponse.json({ ok: true, procesate: 0, motiv: "netopia_neconfigurat", facturi });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://fundraising-academy-one.vercel.app").replace(/\/$/, "");

  // Fără `app.public_lookup`, RLS pe organizations/memberships/app_users
  // respinge silențios — rulat fără sesiune de user, ca orice cron/webhook —
  // interogarea de mai jos ar întoarce mereu 0 rânduri, indiferent dacă există
  // organizații de reînnoit. (Comentariul vechi de deasupra promitea deja
  // acest context de încredere — lipsea doar implementarea efectivă.)
  const { orgs, avize, proprietari } = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

    const orgs = await tx
      .select({
        id: organizations.id,
        slug: organizations.slug,
        name: organizations.name,
        referredByOrgId: organizations.referredByOrgId,
        package: organizations.package,
        customPlanConfig: organizations.customPlanConfig,
        netopiaCardTokenEnc: organizations.netopiaCardTokenEnc,
        netopiaRenewalAttempts: organizations.netopiaRenewalAttempts,
        cif: organizations.cif,
        adresaSediu: organizations.adresaSediu,
        judet: organizations.judet,
        currentPeriodEnd: organizations.currentPeriodEnd,
        netopiaCardMasked: organizations.netopiaCardMasked,
        netopiaCardExpireMonth: organizations.netopiaCardExpireMonth,
        netopiaCardExpireYear: organizations.netopiaCardExpireYear,
      })
      .from(organizations)
      .where(
        and(
          eq(organizations.netopiaAutoRenew, true),
          sql`${organizations.netopiaCardTokenEnc} is not null`,
          // "mâine" — reînnoim proactiv o zi înainte de expirare, ca accesul să nu
          // aibă niciodată o fereastră de întrerupere între expirare și taxare.
          lte(organizations.currentPeriodEnd, sql`now() + interval '1 day'`),
        ),
      );

    // Organizații cu reînnoire activă care vor fi taxate în 1–4 zile — primesc un aviz (o singură dată).
    const avize = await tx
      .select({
        id: organizations.id,
        slug: organizations.slug,
        name: organizations.name,
        package: organizations.package,
        customPlanConfig: organizations.customPlanConfig,
        currentPeriodEnd: organizations.currentPeriodEnd,
        netopiaCardMasked: organizations.netopiaCardMasked,
        netopiaCardExpireMonth: organizations.netopiaCardExpireMonth,
        netopiaCardExpireYear: organizations.netopiaCardExpireYear,
      })
      .from(organizations)
      .where(
        and(
          eq(organizations.netopiaAutoRenew, true),
          sql`${organizations.netopiaCardTokenEnc} is not null`,
          sql`${organizations.package} <> 'trial'`,
          sql`${organizations.currentPeriodEnd} > now() + interval '1 day'`,
          sql`${organizations.currentPeriodEnd} <= now() + interval '4 days'`,
        ),
      );

    const ids = [...new Set([...orgs.map((o) => o.id), ...avize.map((o) => o.id)])];
    if (ids.length === 0) return { orgs, avize, proprietari: [] };

    const proprietari = await tx
      .select({ orgId: memberships.orgId, email: appUsers.email })
      .from(memberships)
      .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
      .where(and(inArray(memberships.orgId, ids), eq(memberships.role, "owner")));
    return { orgs, avize, proprietari };
  });

  if (orgs.length === 0 && avize.length === 0) {
    return NextResponse.json({ ok: true, procesate: 0, facturi });
  }
  const emailProprietar = new Map<string, string>();
  for (const p of proprietari) if (!emailProprietar.has(p.orgId)) emailProprietar.set(p.orgId, p.email);

  const rezultate: { orgSlug: string; rezultat: string }[] = [];

  // Avizul de reînnoire: data, suma și cardul, cu 1–4 zile înainte. Dedupe pe (organizație, sfârșit de
  // perioadă) — un singur aviz pe perioadă, chiar dacă cron-ul rulează zilnic în această fereastră.
  for (const org of avize) {
    try {
      const email = emailProprietar.get(org.id);
      const pret = pretSiEticheta(org);
      if (!email || !pret || !org.currentPeriodEnd || !emailConfigurat()) continue;
      const cheie = `${org.id}:${org.currentPeriodEnd.toISOString().slice(0, 10)}`;
      if (!(await verificaLimitaRata("reinnoire-aviz", cheie, 1, 14 * 24 * 60))) continue;
      const dataTaxare = new Date(org.currentPeriodEnd.getTime() - 86_400_000);
      await trimiteEmail({
        to: email,
        subiect: subiectAvizReinnoire(),
        html: htmlAvizReinnoire({
          orgName: org.name,
          dataTaxare: formatData(dataTaxare),
          sumaLei: pret.pret,
          packageLabel: pret.eticheta,
          card: org.netopiaCardMasked ?? "salvat",
          cardExpiraInainte: cardExpiratLa(org.netopiaCardExpireMonth, org.netopiaCardExpireYear, dataTaxare),
          setariUrl: `${baseUrl}/${org.slug}/setari`,
        }),
      }).catch((e) => raporteazaEroare("netopia-reinnoire-aviz", e, { orgSlug: org.slug }));
      rezultate.push({ orgSlug: org.slug, rezultat: "aviz_trimis" });
    } catch (e) {
      raporteazaEroare("netopia-reinnoire-aviz", e, { orgSlug: org.slug });
    }
  }

  for (const org of orgs) {
    try {
      if (org.package === "trial") {
        raporteazaAvertisment("netopia-reinnoire", "organizație în probă cu reînnoire automată activă — ignorată", { orgSlug: org.slug });
        continue;
      }
      const facturareEmail = emailProprietar.get(org.id);
      if (!facturareEmail) {
        raporteazaAvertisment("netopia-reinnoire", "organizația nu are niciun owner cu email — reînnoire omisă", { orgSlug: org.slug });
        continue;
      }

      // Fără CIF/adresă/județ factura Oblio ar pleca pe „persoană fizică" — nu
      // încasăm ce nu putem factura corect. Reînnoirea e amânată (organizația
      // rămâne în fereastra cron-ului și e reluată automat după ce completează
      // datele), iar ownerul e anunțat zilnic, dar doar până la 3 zile după
      // expirare — ca un cont abandonat să nu primească emailuri la nesfârșit.
      if (!dateFacturareComplete({ cif: org.cif, adresaSediu: org.adresaSediu, judet: org.judet })) {
        raporteazaAvertisment("netopia-reinnoire", "date de facturare incomplete — reînnoire amânată", { orgSlug: org.slug });
        rezultate.push({ orgSlug: org.slug, rezultat: "amanata:date_facturare_lipsa" });
        const recent = !org.currentPeriodEnd || org.currentPeriodEnd.getTime() > Date.now() - 3 * 86_400_000;
        if (recent && emailConfigurat()) {
          await trimiteEmail({
            to: facturareEmail,
            subiect: subiectDateFacturareLipsa(),
            html: htmlDateFacturareLipsa({ orgName: org.name, setariUrl: `${baseUrl}/${org.slug}/setari` }),
          }).catch((e) => raporteazaEroare("netopia-reinnoire-email", e, { orgSlug: org.slug }));
        }
        continue;
      }

      // Card expirat: nu încercăm o taxare sortită eșecului (și nu consumăm o încercare din cele 3) — anunțăm o
      // singură dată pe perioadă; accesul plătit rămâne până la sfârșitul perioadei.
      if (cardExpiratLa(org.netopiaCardExpireMonth, org.netopiaCardExpireYear, new Date())) {
        rezultate.push({ orgSlug: org.slug, rezultat: "amanata:card_expirat" });
        const cheie = `${org.id}:${org.currentPeriodEnd ? org.currentPeriodEnd.toISOString().slice(0, 10) : "x"}`;
        if (emailConfigurat() && (await verificaLimitaRata("reinnoire-card-expirat", cheie, 1, 14 * 24 * 60))) {
          await trimiteEmail({
            to: facturareEmail,
            subiect: subiectCardExpirat(),
            html: htmlCardExpirat({ orgName: org.name, card: org.netopiaCardMasked ?? "salvat", setariUrl: `${baseUrl}/${org.slug}/setari` }),
          }).catch((e) => raporteazaEroare("netopia-reinnoire-email", e, { orgSlug: org.slug }));
        }
        continue;
      }

      const pretLunar =
        org.package === "custom"
          ? (org.customPlanConfig as CustomPlanConfigSaved | null)?.pretLunar
          : PACKAGE_LIMITS[org.package as Exclude<OrgPackage, "trial" | "custom">].pretLunar;
      if (!pretLunar) {
        raporteazaAvertisment("netopia-reinnoire", "prețul lunar lipsește — reînnoire omisă", { orgSlug: org.slug, package: org.package });
        continue;
      }
      const packageLabel = org.package === "custom" ? "Plan personalizat" : NUME_PACHET_FIX[org.package as Exclude<OrgPackage, "trial" | "custom">];

      const rezultat = await taxeazaReinnoireAutomata(
        {
          id: org.id,
          slug: org.slug,
          name: org.name,
          referredByOrgId: org.referredByOrgId,
          package: org.package as Exclude<OrgPackage, "trial">,
          pretLunar,
          packageLabel,
          planConfig: org.package === "custom" ? (org.customPlanConfig as CustomPlanConfigSaved) : null,
          netopiaCardTokenEnc: org.netopiaCardTokenEnc,
          facturareEmail,
        },
        baseUrl,
      );

      if (!rezultat.ok) {
        rezultate.push({ orgSlug: org.slug, rezultat: `eroare:${rezultat.motiv}` });
        continue;
      }

      rezultate.push({ orgSlug: org.slug, rezultat: rezultat.confirmare.actiune });

      if (rezultat.confirmare.actiune === "esuata" && rezultat.confirmare.renewal && emailConfigurat()) {
        const incercariRamase = Math.max(0, NETOPIA_RENEWAL_MAX_INCERCARI - (org.netopiaRenewalAttempts + 1));
        await trimiteEmail({
          to: facturareEmail,
          subiect: subiectReinnoireEsuata(incercariRamase),
          html: htmlReinnoireEsuata({
            orgName: org.name,
            setariUrl: `${baseUrl}/${org.slug}/setari`,
            incercariRamase,
            reinnoireDezactivata: rezultat.confirmare.reinnoireDezactivata,
          }),
        }).catch((e) => raporteazaEroare("netopia-reinnoire-email", e, { orgSlug: org.slug }));
      }
    } catch (e) {
      raporteazaEroare("netopia-reinnoire", e, { orgSlug: org.slug });
      rezultate.push({ orgSlug: org.slug, rezultat: "eroare_neasteptata" });
    }
  }

  return NextResponse.json({ ok: true, procesate: orgs.length, rezultate, facturi });
}
