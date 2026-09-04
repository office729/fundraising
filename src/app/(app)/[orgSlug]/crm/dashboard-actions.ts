"use server";

import { and, gte, sql } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { apeluri } from "@/lib/db/schema";

// Sursa reală pentru cardul "Apeluri" din "Activitatea echipei" (dashboard) —
// număr de apeluri REALE (Twilio), nu cifra demonstrativă fixă de dinainte.
// Numără toate încercările (indiferent de rezultat), ca "câte telefoane a
// dat" să răspundă efectiv la întrebare.
export const numarApeluriUltimele30Zile = withOrgSession(async (ctx) => {
  const [{ n }] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(apeluri)
    .where(and(sql`${apeluri.orgId} = ${ctx.orgId}`, gte(apeluri.createdAt, sql`now() - interval '30 days'`)));
  return n;
});
