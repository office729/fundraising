import "server-only";
import { sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import type { CustomPlanConfigSaved } from "@/lib/billing/custom-plan";
import { isAccessBlocked } from "@/lib/billing/trial";
import { db } from "@/lib/db";
import { EroareUtilizator } from "@/lib/erori";
import type { DomeniuActivitate } from "@/lib/campaign-templates";

import { findBeneficiaryProfile } from "./beneficiar";
import { ensureAppUser, getAuthUser } from "./dal";
import { findOrgMembership } from "./org";

export type OrgRole = "owner" | "admin" | "member";

export type OrgContext = {
  orgId: string;
  orgSlug: string;
  orgName: string;
  orgLogoUrl: string | null;
  orgSlogan: string | null;
  orgBrandColor: string | null;
  orgCustomDomain: string | null;
  orgCif: string | null;
  orgAdresaSediu: string | null;
  orgJudet: string | null;
  orgIban: string | null;
  orgDomeniuActivitate: DomeniuActivitate | null;
  orgPackage: "trial" | "start" | "crestere" | "impact" | "custom";
  // Doar pentru pachetul "custom" — cotele reale (utilizatori/contactePf/
  // companiiPj) diferă de PACKAGE_LIMITS, vezi lib/billing/quota.ts.
  orgCustomPlanConfig: CustomPlanConfigSaved | null;
  orgSubscriptionStatus: string;
  // Sfârșitul perioadei plătite (abonamentul platformei, prin Netopia) — accesul
  // se închide când trece, chiar dacă starea a rămas "active" (vezi
  // lib/billing/trial.ts).
  orgCurrentPeriodEnd: Date | null;
  orgCreatedAt: Date;
  orgReferralCode: string | null;
  orgReferredByOrgId: string | null;
  orgStripeCustomerId: string | null;
  orgStripeSubscriptionId: string | null;
  userId: string;
  userEmail: string;
  userName: string | null;
  // Versiunea Termenilor acceptată de user (null = nu a acceptat niciodată) —
  // layout-ul cere reacceptarea când diferă de TERMENI_VERSIUNE.
  userTermsVersion: string | null;
  role: OrgRole;
  // Instanța Drizzle LEGATĂ de tranzacția curentă (cea pe care s-a făcut
  // set_config). NU e `db`-ul global — vezi avertismentul de mai jos.
  db: typeof db;
};

/**
 * Graniță de autorizare + izolare de tenant pentru orice Server Action sau
 * route handler care atinge date de tenant (companii, donatori, rapoarte etc.).
 *
 * ⚠️ CRITIC: acțiunea înfășurată TREBUIE să folosească `ctx.db` pentru toate
 * interogările, NU importul global `db`. Contextul de izolare (org_id, user_id)
 * e setat prin `set_config(..., true)` — scop de TRANZACȚIE (echivalent SET LOCAL) —
 * deci hidratarea RLS e vizibilă doar pe conexiunea care a rulat acel set_config.
 * Dacă o interogare folosește `db` (poolul global), RLS o vede fără context
 * de organizație și — fiind FORCE ROW LEVEL SECURITY — nu va întoarce NIMIC
 * (fail-closed, dar tot un bug de funcționalitate, nu doar teoretic).
 *
 * Prim argument = orgSlug (vine din ruta `[orgSlug]`, transmis explicit de
 * caller — Server Actions nu au acces direct la URL).
 *
 * Uz:
 *   export const listaFirme = withOrgSession(async (ctx) => {
 *     return ctx.db.select().from(companies); // RLS filtrează automat pe org
 *   });
 *   // apelat din UI: await listaFirme(orgSlug)
 */
// Opțiuni: `permiteAccesBlocat` doar pentru ce trebuie să meargă și când proba
// s-a terminat și nu există abonament valabil — pornirea plății și pagina de
// rezultat a plății. Orice altceva e refuzat AICI, nu doar ascuns de layout.
export type OrgSessionOptions = { permiteAccesBlocat?: boolean };

export function withOrgSession<A extends unknown[], R>(
  action: (ctx: OrgContext, ...args: A) => Promise<R>,
  opts?: OrgSessionOptions,
): (orgSlug: string, ...args: A) => Promise<R> {
  return async (orgSlug: string, ...args: A) => {
    const authUser = await getAuthUser();
    if (!authUser?.email) {
      redirect("/login");
    }

    return db.transaction(async (tx) => {
      // Pas 1: contextul de email — singurul lucru știut cu certitudine la
      // primul login, înainte să existe un rând app_users.
      await tx.execute(sql`select set_config('app.current_user_email', ${authUser.email}, true)`);

      const appUser = await ensureAppUser(
        tx as unknown as typeof db,
        authUser.email!,
        (authUser.user_metadata?.name as string | undefined) ?? null,
      );

      // Pas 2: acum că app_users există, fixăm user_id pentru restul tranzacției.
      await tx.execute(sql`select set_config('app.current_user_id', ${appUser.id}, true)`);

      const found = await findOrgMembership(tx as unknown as typeof db, orgSlug, appUser.id);
      if (!found) {
        // Fie organizația nu există, fie userul nu e membru — nu distingem
        // ca să nu scurgem informație despre existența unor organizații străine.
        notFound();
      }

      // Pas 3: fixăm org_id — de-acum, toate tabelele de tenant sunt vizibile
      // filtrate corect prin politicile RLS.
      await tx.execute(sql`select set_config('app.current_org_id', ${found.org.id}, true)`);

      const ctx: OrgContext = {
        orgId: found.org.id,
        orgSlug: found.org.slug,
        orgName: found.org.name,
        orgLogoUrl: found.org.logoUrl,
        orgSlogan: found.org.slogan,
        orgBrandColor: found.org.brandColor,
        orgCustomDomain: found.org.customDomain,
        orgCif: found.org.cif,
        orgAdresaSediu: found.org.adresaSediu,
        orgJudet: found.org.judet,
        orgIban: found.org.iban,
        orgDomeniuActivitate: found.org.domeniuActivitate,
        orgPackage: found.org.package,
        orgCustomPlanConfig: found.org.customPlanConfig as CustomPlanConfigSaved | null,
        orgSubscriptionStatus: found.org.subscriptionStatus,
        orgCurrentPeriodEnd: found.org.currentPeriodEnd,
        orgCreatedAt: found.org.createdAt,
        orgReferralCode: found.org.referralCode,
        orgReferredByOrgId: found.org.referredByOrgId,
        orgStripeCustomerId: found.org.stripeCustomerId,
        orgStripeSubscriptionId: found.org.stripeSubscriptionId,
        userId: appUser.id,
        userEmail: appUser.email,
        userName: appUser.name,
        userTermsVersion: appUser.termsAcceptedAt ? appUser.termsVersion : null,
        role: found.role,
        db: tx as unknown as typeof db,
      };

      // Paywall-ul era aplicat doar în layout: un cont cu proba expirată nu
      // vedea paginile, dar putea apela în continuare server actions și rutele
      // /api/[orgSlug]/* (email, apeluri Twilio, salvări) — fără să plătească.
      if (
        !opts?.permiteAccesBlocat &&
        isAccessBlocked(
          {
            createdAt: ctx.orgCreatedAt,
            subscriptionStatus: ctx.orgSubscriptionStatus,
            package: ctx.orgPackage,
            currentPeriodEnd: ctx.orgCurrentPeriodEnd,
          },
          ctx.userEmail,
        )
      ) {
        throw new EroareUtilizator("Perioada de probă s-a încheiat — alege un pachet ca să continui.");
      }
      return action(ctx, ...args);
    });
  };
}

export function withOrgAdmin<A extends unknown[], R>(
  action: (ctx: OrgContext, ...args: A) => Promise<R>,
  opts?: OrgSessionOptions,
): (orgSlug: string, ...args: A) => Promise<R> {
  return withOrgSession(async (ctx, ...args: A) => {
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      throw new EroareUtilizator("Necesită rol de admin sau owner în organizație.");
    }
    return action(ctx, ...args);
  }, opts);
}

/**
 * Acțiune în TREI FAZE, ca o conexiune de bază de date să NU rămână deschisă cât durează un apel extern lent
 * (model AI de 30–90 s, trimitere de emailuri, Canva etc.). `withOrgSession` ține o tranzacție + o conexiune din
 * pool (max 5 per instanță) pe toată durata acțiunii — câteva generări AI simultane epuizau pool-ul și blocau
 * inclusiv webhook-urile Stripe de pe aceeași instanță.
 *
 *  1. `pregateste` — în tranzacție, SCURT: verifică accesul, citește ce trebuie, validează. Întoarce fie `{ gata }`
 *     (răspuns final, ex. o eroare de validare), fie `{ pregatit }` (date SIMPLE, fără `ctx.db`) pentru fazele următoare.
 *  2. `extern` — FĂRĂ tranzacție și fără conexiune DB: apelul lent.
 *  3. `salveaza` — o tranzacție nouă (cu verificarea accesului refăcută), scurtă: scrie rezultatul. Opțională: fără ea,
 *     rezultatul fazei externe e răspunsul.
 * Argumentele acțiunii se repetă în faza 3. `pregatit` și rezultatul extern nu trec prin rețea (apel în același proces).
 */
export function withOrgFaze<A extends unknown[], P, X, R>(cfg: {
  admin?: boolean;
  opts?: OrgSessionOptions;
  pregateste: (ctx: OrgContext, ...args: A) => Promise<{ gata: R } | { pregatit: P }>;
  extern: (pregatit: P) => Promise<X>;
  salveaza?: (ctx: OrgContext, pregatit: P, rezultatExtern: X, ...args: A) => Promise<R>;
}): (orgSlug: string, ...args: A) => Promise<R> {
  const wrap: typeof withOrgSession = cfg.admin ? (withOrgAdmin as typeof withOrgSession) : withOrgSession;
  const faza1 = wrap(async (ctx: OrgContext, ...args: A) => cfg.pregateste(ctx, ...args), cfg.opts);
  const faza3 = cfg.salveaza
    ? wrap(async (ctx: OrgContext, pregatit: P, rezultatExtern: X, ...args: A) => cfg.salveaza!(ctx, pregatit, rezultatExtern, ...args), cfg.opts)
    : null;
  return async (orgSlug: string, ...args: A): Promise<R> => {
    const r = await faza1(orgSlug, ...args);
    if ("gata" in r) return r.gata;
    const extern = await cfg.extern(r.pregatit);
    if (!faza3) return extern as unknown as R;
    return faza3(orgSlug, r.pregatit, extern, ...args);
  };
}

export type OrgAccess = Omit<OrgContext, "db">;

/**
 * Verificare de acces pentru layout-uri/pagini (Server Components), NU pentru
 * mutații. Spre deosebire de `withOrgSession`, întoarce DOAR date simple —
 * niciodată `ctx.db` — pentru că tranzacția internă se închide înainte de a
 * reveni din această funcție; un handle de tranzacție închisă nu mai poate fi
 * folosit ulterior în alte Server Components din arborele de randare.
 * Fiecare bucată de date de tenant se citește separat, prin propriul apel
 * `withOrgSession(...)`.
 */
export function requireOrgAccess(orgSlug: string): Promise<OrgAccess> {
  return withOrgSession(async (ctx) => ({
    orgId: ctx.orgId,
    orgSlug: ctx.orgSlug,
    orgName: ctx.orgName,
    orgLogoUrl: ctx.orgLogoUrl,
    orgSlogan: ctx.orgSlogan,
    orgBrandColor: ctx.orgBrandColor,
    orgCustomDomain: ctx.orgCustomDomain,
    orgCif: ctx.orgCif,
    orgAdresaSediu: ctx.orgAdresaSediu,
    orgJudet: ctx.orgJudet,
    orgIban: ctx.orgIban,
    orgDomeniuActivitate: ctx.orgDomeniuActivitate,
    orgPackage: ctx.orgPackage,
    orgCustomPlanConfig: ctx.orgCustomPlanConfig,
    orgSubscriptionStatus: ctx.orgSubscriptionStatus,
    orgCurrentPeriodEnd: ctx.orgCurrentPeriodEnd,
    orgCreatedAt: ctx.orgCreatedAt,
    orgReferralCode: ctx.orgReferralCode,
    orgReferredByOrgId: ctx.orgReferredByOrgId,
    orgStripeCustomerId: ctx.orgStripeCustomerId,
    orgStripeSubscriptionId: ctx.orgStripeSubscriptionId,
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    userName: ctx.userName,
    userTermsVersion: ctx.userTermsVersion,
    role: ctx.role,
    // Verificarea de acces citește starea abonamentului ca să decidă paywall-ul
    // (layout-ul) — dacă ar fi ea însăși blocată de paywall, layout-ul ar crăpa
    // în loc să-l afișeze. Nu întoarce date de tenant, doar contextul organizației.
  }), { permiteAccesBlocat: true })(orgSlug);
}

// ---------------------------------------------------------------------------
// Modul „Persoană fizică / Beneficiar" — oglindă a withOrgSession/
// requireOrgAccess de mai sus, dar scopată pe o campanie, nu pe o organizație.
// ⚠️ NU setează niciodată app.current_org_id — un beneficiar nu trebuie
// confundat cu un membru al organizației (ar vedea toate datele tenantului).
// ---------------------------------------------------------------------------

export type BeneficiarContext = {
  beneficiarId: string;
  campaignPageId: string;
  campaignSlug: string;
  campaignTitlu: string;
  campaignPoveste: string;
  campaignImagineUrl: string | null;
  campaignSumaTinta: number | null;
  campaignSumaStransa: number | null;
  campaignJudet: string | null;
  campaignLocalitate: string | null;
  orgId: string;
  orgSlug: string;
  orgName: string;
  userId: string;
  userEmail: string;
  userName: string | null;
  userTermsVersion: string | null;
  db: typeof db;
};

/**
 * Graniță de autorizare + izolare pentru orice Server Action sau route
 * handler din portalul beneficiarului. Vezi avertismentul de la
 * `withOrgSession` — se aplică identic aici: acțiunea înfășurată TREBUIE să
 * folosească `ctx.db`, nu importul global `db`.
 */
export function withBeneficiarSession<A extends unknown[], R>(
  action: (ctx: BeneficiarContext, ...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    const authUser = await getAuthUser();
    if (!authUser?.email) {
      redirect("/login");
    }

    return db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.current_user_email', ${authUser.email}, true)`);

      const appUser = await ensureAppUser(
        tx as unknown as typeof db,
        authUser.email!,
        (authUser.user_metadata?.name as string | undefined) ?? null,
      );

      await tx.execute(sql`select set_config('app.current_user_id', ${appUser.id}, true)`);

      const found = await findBeneficiaryProfile(tx as unknown as typeof db, appUser.id);
      if (!found) {
        notFound();
      }

      // De-acum, tabelele modulului beneficiar sunt vizibile filtrate corect
      // prin politicile RLS scopate pe această campanie.
      await tx.execute(
        sql`select set_config('app.current_beneficiary_campaign_id', ${found.page.id}, true)`,
      );

      // findBeneficiaryProfile a pornit app.public_lookup ca să citească
      // organizations/fundraising_pages (beneficiarul nu e membru). Îl oprim aici:
      // lăsat activ, politicile *_webhook_* (organizations, donații, plăți...) ar
      // rămâne deschise pentru ORICE interogare din pagina/acțiunea beneficiarului.
      // Tabelele modulului (sarcini, facturi, mesaje, notificări...) au politici
      // proprii, pe campanie/app_user, care nu depind de acest GUC.
      await tx.execute(sql`select set_config('app.public_lookup', '', true)`);

      const ctx: BeneficiarContext = {
        beneficiarId: found.beneficiary.id,
        campaignPageId: found.page.id,
        campaignSlug: found.page.slug,
        campaignTitlu: found.page.titlu,
        campaignPoveste: found.page.poveste,
        campaignImagineUrl: found.page.imagineUrl,
        campaignSumaTinta: found.page.sumaTinta,
        campaignSumaStransa: found.page.sumaStransa,
        campaignJudet: found.page.judet,
        campaignLocalitate: found.page.localitate,
        orgId: found.beneficiary.orgId,
        orgSlug: found.orgSlug,
        orgName: found.orgName,
        userId: appUser.id,
        userEmail: appUser.email,
        userName: appUser.name,
        userTermsVersion: appUser.termsAcceptedAt ? appUser.termsVersion : null,
        db: tx as unknown as typeof db,
      };
      return action(ctx, ...args);
    });
  };
}

export type BeneficiarAccess = Omit<BeneficiarContext, "db">;

export function requireBeneficiarAccess(): Promise<BeneficiarAccess> {
  return withBeneficiarSession(async (ctx) => ({
    beneficiarId: ctx.beneficiarId,
    campaignPageId: ctx.campaignPageId,
    campaignSlug: ctx.campaignSlug,
    campaignTitlu: ctx.campaignTitlu,
    campaignPoveste: ctx.campaignPoveste,
    campaignImagineUrl: ctx.campaignImagineUrl,
    campaignSumaTinta: ctx.campaignSumaTinta,
    campaignSumaStransa: ctx.campaignSumaStransa,
    campaignJudet: ctx.campaignJudet,
    campaignLocalitate: ctx.campaignLocalitate,
    orgId: ctx.orgId,
    orgSlug: ctx.orgSlug,
    orgName: ctx.orgName,
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    userName: ctx.userName,
    userTermsVersion: ctx.userTermsVersion,
  }))();
}
