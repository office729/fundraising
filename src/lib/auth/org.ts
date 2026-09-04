import "server-only";

import { and, eq } from "drizzle-orm";

import { memberships, organizations } from "@/lib/db/schema";

// Query pur — primește tranzacția (tx) în care rulează, nu importă `db` global.
// Apelat DUPĂ ce app.current_user_id a fost setat în acea tranzacție (guard.ts),
// altfel politicile RLS pe `memberships`/`organizations` nu ar returna nimic.
export async function findOrgMembership(
  tx: { select: typeof import("@/lib/db").db.select },
  orgSlug: string,
  userId: string,
) {
  const orgRows = await tx.select().from(organizations).where(eq(organizations.slug, orgSlug)).limit(1);
  const org = orgRows[0];
  if (!org) return null;

  const membershipRows = await tx
    .select()
    .from(memberships)
    .where(and(eq(memberships.orgId, org.id), eq(memberships.userId, userId)))
    .limit(1);
  const membership = membershipRows[0];
  if (!membership) return null;

  return { org, role: membership.role };
}
