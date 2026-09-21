"use server";

import { and, gte, sql } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { apeluri, companies, companySponsorizari } from "@/lib/db/schema";
import { segmentFirma } from "@/lib/id-scurt";

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

// Top firme sponsori (total, toate sponsorizările înregistrate) — date REALE din
// fișele companiilor, pentru cardul „Top sponsori” de pe prima pagină.
export const topFirmeSponsori = withOrgSession(async (ctx) => {
  const rows = await ctx.db
    .select({
      id: companies.id,
      nume: companies.nume,
      total: sql<number>`sum(${companySponsorizari.suma})::int`,
      numar: sql<number>`count(*)::int`,
    })
    .from(companySponsorizari)
    .innerJoin(companies, sql`${companies.id} = ${companySponsorizari.companyId}`)
    .where(and(sql`${companySponsorizari.orgId} = ${ctx.orgId}`, sql`${companies.deletedAt} is null`))
    .groupBy(companies.id, companies.nume)
    .orderBy(sql`sum(${companySponsorizari.suma}) desc`)
    .limit(7);
  return rows.map((r) => ({ id: r.id, nume: r.nume, total: r.total, numar: r.numar, segment: segmentFirma(r.nume, r.id) }));
});
