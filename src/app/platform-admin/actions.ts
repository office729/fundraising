"use server";

import { desc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";

import { getAuthUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/billing/trial";
import { db } from "@/lib/db";
import { appUsers, memberships, organizations } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";

// Garda pentru toate acțiunile din acest fișier — propriul verificator, NU
// withOrgAdmin/withOrgSession (acelea sunt scopate la UN org; aici citim/
// scriem peste TOATE organizațiile, context de încredere separat).
async function cerePlatformAdmin(): Promise<string> {
  const authUser = await getAuthUser();
  if (!authUser?.email) redirect("/login");
  if (!isPlatformAdmin(authUser.email)) throw new EroareUtilizator("Acces interzis.");
  return authUser.email;
}

export type OrgRand = {
  id: string;
  nume: string;
  slug: string;
  package: string;
  subscriptionStatus: string;
  currentPeriodEnd: Date | null;
  createdAt: Date;
  proprietarEmail: string | null;
  proprietarUltimaAutentificare: Date | null;
};

// Listă completă — toate organizațiile, indiferent de abonament, cu
// proprietarul (primul membru cu rol owner) și ultima lui autentificare.
// Rulează în contextul de încredere `app.public_lookup` (vezi
// organizations_public_lookup/app_users_public_lookup/memberships_public_lookup
// în restore-rls.mjs) — singurul loc din platformă unde se citește cross-org,
// gardat explicit mai sus prin cerePlatformAdmin().
export async function listeazaOrganizatiiAction(): Promise<OrgRand[]> {
  await cerePlatformAdmin();
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const rows = await tx
      .select({
        id: organizations.id,
        nume: organizations.name,
        slug: organizations.slug,
        package: organizations.package,
        subscriptionStatus: organizations.subscriptionStatus,
        currentPeriodEnd: organizations.currentPeriodEnd,
        createdAt: organizations.createdAt,
        proprietarEmail: appUsers.email,
        proprietarUltimaAutentificare: appUsers.lastLoginAt,
      })
      .from(organizations)
      .leftJoin(
        memberships,
        sql`${memberships.orgId} = ${organizations.id} and ${memberships.role} = 'owner'`,
      )
      .leftJoin(appUsers, eq(appUsers.id, memberships.userId))
      .orderBy(desc(organizations.createdAt));
    return rows;
  });
}

// Ajustare manuală, „la cerere" — pachetul și/sau sfârșitul perioadei plătite
// ale unei organizații, direct din panoul platformei (ex. extindere probă,
// upgrade manual convenit telefonic). Nu atinge planConfig-ul custom — dacă
// e nevoie de un plan à la carte, se face din construitorul de plan normal.
export async function ajusteazaOrgAction(
  orgId: string,
  values: { package: string; subscriptionStatus: string; currentPeriodEnd: string | null },
): Promise<void> {
  const actorEmail = await cerePlatformAdmin();
  // Tipurile TypeScript nu protejează o acțiune apelată direct: validăm id-ul, enumurile și data înainte de scriere.
  const PACHETE = ["trial", "start", "crestere", "impact", "custom"];
  const STATUSURI = ["trialing", "active", "past_due", "canceled", "incomplete"];
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const sfarsit = values.currentPeriodEnd ? new Date(values.currentPeriodEnd) : null;
  if (!UUID.test(orgId) || !PACHETE.includes(values.package) || !STATUSURI.includes(values.subscriptionStatus) || (sfarsit && Number.isNaN(sfarsit.getTime()))) {
    throw new Error("Valori invalide pentru ajustarea organizației.");
  }
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    await tx
      .update(organizations)
      .set({
        package: values.package as (typeof organizations.$inferInsert)["package"],
        subscriptionStatus: values.subscriptionStatus as (typeof organizations.$inferInsert)["subscriptionStatus"],
        currentPeriodEnd: sfarsit,
      })
      .where(eq(organizations.id, orgId));
  });
  // Doar în log-ul serverului (Sentry/consolă) — un audit log dedicat
  // platform-admin e în afara scopului acestei treceri.
  console.log(`[platform-admin] ${actorEmail} a ajustat org ${orgId}:`, values);
}
