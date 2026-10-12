import { and, eq, sql } from "drizzle-orm";

import type { db } from "@/lib/db";
import { campaignPageEvents, fundraisingDonations, fundraisingPages } from "@/lib/db/schema";

const ziuaRoSql = sql`(timezone('Europe/Bucharest', now()))::date`;

export async function incarcaStatistici(dbx: typeof db, orgId: string, orgSlug: string, zile: number) {
  const de = sql`(${ziuaRoSql} - ${zile - 1}::int)`;
  const ev = campaignPageEvents;
  const dOrg = and(eq(ev.orgId, orgId), sql`${ev.ziua} >= ${de}`);
  const donOrg = and(
    eq(fundraisingDonations.orgId, orgId),
    eq(fundraisingDonations.status, "reusita"),
    sql`(timezone('Europe/Bucharest', ${fundraisingDonations.createdAt}))::date >= ${de}`,
  );
  const venitNet = sql<number>`coalesce(sum(${fundraisingDonations.suma} - ${fundraisingDonations.sumaRambursata}), 0)::int`;

  const [prima, global, zilnic, perPagina, surse, sursaDetalii, dispozitive, tari, utm, donGlobal, donZilnic, donPerPagina, donSursa, pagini] = await Promise.all([
    dbx.select({ prima: sql<string | null>`min(${ev.ziua})::text` }).from(ev).where(eq(ev.orgId, orgId)),
    dbx
      .select({
        tip: ev.tip,
        vizualizari: sql<number>`count(*)::int`,
        unici: sql<number>`count(distinct (${ev.ziua}::text || ${ev.vizitator}))::int`,
      })
      .from(ev)
      .where(dOrg)
      .groupBy(ev.tip),
    dbx
      .select({ ziua: sql<string>`${ev.ziua}::text`, unici: sql<number>`count(distinct ${ev.vizitator})::int` })
      .from(ev)
      .where(and(dOrg, eq(ev.tip, "vizita")))
      .groupBy(ev.ziua),
    dbx
      .select({
        pageId: ev.pageId,
        tip: ev.tip,
        vizualizari: sql<number>`count(*)::int`,
        unici: sql<number>`count(distinct (${ev.ziua}::text || ${ev.vizitator}))::int`,
      })
      .from(ev)
      .where(dOrg)
      .groupBy(ev.pageId, ev.tip),
    dbx
      .select({ sursa: ev.sursa, unici: sql<number>`count(distinct (${ev.ziua}::text || ${ev.vizitator}))::int` })
      .from(ev)
      .where(and(dOrg, eq(ev.tip, "vizita")))
      .groupBy(ev.sursa),
    dbx
      .select({ sursa: ev.sursa, detaliu: ev.sursaDetaliu, unici: sql<number>`count(distinct (${ev.ziua}::text || ${ev.vizitator}))::int` })
      .from(ev)
      .where(and(dOrg, eq(ev.tip, "vizita"), sql`${ev.sursaDetaliu} is not null`))
      .groupBy(ev.sursa, ev.sursaDetaliu)
      .orderBy(sql`2 desc`)
      .limit(8),
    dbx
      .select({ dispozitiv: ev.dispozitiv, unici: sql<number>`count(distinct (${ev.ziua}::text || ${ev.vizitator}))::int` })
      .from(ev)
      .where(and(dOrg, eq(ev.tip, "vizita")))
      .groupBy(ev.dispozitiv),
    dbx
      .select({ tara: ev.tara, unici: sql<number>`count(distinct (${ev.ziua}::text || ${ev.vizitator}))::int` })
      .from(ev)
      .where(and(dOrg, eq(ev.tip, "vizita"), sql`${ev.tara} is not null`))
      .groupBy(ev.tara)
      .orderBy(sql`2 desc`)
      .limit(5),
    dbx
      .select({ utm: ev.utmCampanie, unici: sql<number>`count(distinct (${ev.ziua}::text || ${ev.vizitator}))::int` })
      .from(ev)
      .where(and(dOrg, eq(ev.tip, "vizita"), sql`${ev.utmCampanie} is not null`))
      .groupBy(ev.utmCampanie)
      .orderBy(sql`2 desc`)
      .limit(8),
    dbx.select({ donatii: sql<number>`count(*)::int`, venituri: venitNet, recurente: sql<number>`count(*) filter (where ${fundraisingDonations.recurenta})::int` }).from(fundraisingDonations).where(donOrg),
    dbx
      .select({ ziua: sql<string>`(timezone('Europe/Bucharest', ${fundraisingDonations.createdAt}))::date::text`, donatii: sql<number>`count(*)::int`, venituri: venitNet })
      .from(fundraisingDonations)
      .where(donOrg)
      .groupBy(sql`1`),
    dbx
      .select({ pageId: fundraisingDonations.pageId, donatii: sql<number>`count(*)::int`, venituri: venitNet })
      .from(fundraisingDonations)
      .where(donOrg)
      .groupBy(fundraisingDonations.pageId),
    dbx
      .select({ sursa: fundraisingDonations.sursaMarketing, donatii: sql<number>`count(*)::int`, venituri: venitNet })
      .from(fundraisingDonations)
      .where(and(donOrg, sql`${fundraisingDonations.sursaMarketing} is not null`))
      .groupBy(fundraisingDonations.sursaMarketing)
      .orderBy(sql`3 desc`)
      .limit(8),
    dbx
      .select({ id: fundraisingPages.id, titlu: fundraisingPages.titlu, slug: fundraisingPages.slug, status: fundraisingPages.status })
      .from(fundraisingPages)
      .where(eq(fundraisingPages.orgId, orgId)),
  ]);

  return { orgSlug, prima: prima[0]?.prima ?? null, global, zilnic, perPagina, surse, sursaDetalii, dispozitive, tari, utm, donGlobal: donGlobal[0]!, donZilnic, donPerPagina, donSursa, pagini };
}
