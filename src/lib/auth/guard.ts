import "server-only";

import { sql } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { db } from "@/lib/db";

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
  orgPackage: "trial" | "start" | "crestere" | "impact";
  orgSubscriptionStatus: string;
  orgCreatedAt: Date;
  userId: string;
  userEmail: string;
  userName: string | null;
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
export function withOrgSession<A extends unknown[], R>(
  action: (ctx: OrgContext, ...args: A) => Promise<R>,
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
        orgPackage: found.org.package,
        orgSubscriptionStatus: found.org.subscriptionStatus,
        orgCreatedAt: found.org.createdAt,
        userId: appUser.id,
        userEmail: appUser.email,
        userName: appUser.name,
        role: found.role,
        db: tx as unknown as typeof db,
      };
      return action(ctx, ...args);
    });
  };
}

export function withOrgAdmin<A extends unknown[], R>(
  action: (ctx: OrgContext, ...args: A) => Promise<R>,
): (orgSlug: string, ...args: A) => Promise<R> {
  return withOrgSession(async (ctx, ...args: A) => {
    if (ctx.role !== "owner" && ctx.role !== "admin") {
      throw new Error("Necesită rol de admin sau owner în organizație.");
    }
    return action(ctx, ...args);
  });
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
    orgPackage: ctx.orgPackage,
    orgSubscriptionStatus: ctx.orgSubscriptionStatus,
    orgCreatedAt: ctx.orgCreatedAt,
    userId: ctx.userId,
    userEmail: ctx.userEmail,
    userName: ctx.userName,
    role: ctx.role,
  }))(orgSlug);
}
