import { and, eq, inArray, lte, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { NETOPIA_RENEWAL_MAX_INCERCARI } from "@/lib/billing/netopia-confirm";
import { taxeazaReinnoireAutomata } from "@/lib/billing/netopia-checkout";
import { NUME_PACHET_FIX, PACKAGE_LIMITS, type OrgPackage } from "@/lib/billing/packages";
import type { CustomPlanConfigSaved } from "@/lib/billing/custom-plan";
import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { appUsers, memberships, organizations } from "@/lib/db/schema";
import { emailConfigurat, trimiteEmail } from "@/lib/email";
import { netopiaConfigurata } from "@/lib/netopia";
import { htmlReinnoireEsuata, subiectReinnoireEsuata } from "@/lib/netopia-renewal-email-template";
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
  if (!netopiaConfigurata()) {
    return NextResponse.json({ ok: true, procesate: 0, motiv: "netopia_neconfigurat" });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://fundraising-academy-one.vercel.app").replace(/\/$/, "");

  // Fără `app.public_lookup`, RLS pe organizations/memberships/app_users
  // respinge silențios — rulat fără sesiune de user, ca orice cron/webhook —
  // interogarea de mai jos ar întoarce mereu 0 rânduri, indiferent dacă există
  // organizații de reînnoit. (Comentariul vechi de deasupra promitea deja
  // acest context de încredere — lipsea doar implementarea efectivă.)
  const { orgs, proprietari } = await db.transaction(async (tx) => {
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
    if (orgs.length === 0) return { orgs, proprietari: [] };

    const proprietari = await tx
      .select({ orgId: memberships.orgId, email: appUsers.email })
      .from(memberships)
      .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
      .where(and(inArray(memberships.orgId, orgs.map((o) => o.id)), eq(memberships.role, "owner")));
    return { orgs, proprietari };
  });

  if (orgs.length === 0) {
    return NextResponse.json({ ok: true, procesate: 0 });
  }
  const emailProprietar = new Map<string, string>();
  for (const p of proprietari) if (!emailProprietar.has(p.orgId)) emailProprietar.set(p.orgId, p.email);

  const rezultate: { orgSlug: string; rezultat: string }[] = [];

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

  return NextResponse.json({ ok: true, procesate: orgs.length, rezultate });
}
