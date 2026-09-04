import { eq } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { appUsers, memberships } from "@/lib/db/schema";

import { buildOwnerMaps } from "./mapping";

// Lista de membri AI ACESTEI organizații, pentru maparea „responsabil" (prenume)
// ↔ owner_id. Spre deosebire de SOI_CRM (unde `users` era deja roster-ul intern
// unic), aici `app_users` e global pe toată platforma — trebuie filtrat prin
// memberships la organizația curentă, altfel s-ar amesteca angajați din alte ONG-uri.
export async function orgOwnerMaps(ctx: OrgContext) {
  const rows = await ctx.db
    .select({ id: appUsers.id, name: appUsers.name })
    .from(memberships)
    .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
    .where(eq(memberships.orgId, ctx.orgId));
  return buildOwnerMaps(rows);
}
