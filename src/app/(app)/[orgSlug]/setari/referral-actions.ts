"use server";

import { count, eq } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { organizations } from "@/lib/db/schema";
import { getOrCreateReferralCode } from "@/lib/referral";

// Codul propriu + câte organizații s-au înscris folosindu-l — orice membru
// poate vedea (nu doar owner/admin), afișat în Setări.
export const obtineDateReferral = withOrgSession(async (ctx) => {
  const cod = await getOrCreateReferralCode(ctx);
  const rand = await ctx.db.select({ n: count() }).from(organizations).where(eq(organizations.referredByOrgId, ctx.orgId));
  return { cod, numarRecomandari: rand[0]?.n ?? 0 };
});
