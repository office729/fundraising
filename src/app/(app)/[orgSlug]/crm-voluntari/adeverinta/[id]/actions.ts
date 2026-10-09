"use server";

import { and, eq, sql } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { crmKv, fundraisingPages, volunteerShares, volunteerVisitors } from "@/lib/db/schema";

// Datele pentru adeverința de voluntariat: fișa din CRM Voluntari + activitatea din platformă (panou, sarcini îndeplinite).
export type DateAdeverinta = {
  org: { nume: string; cif: string | null; adresa: string | null };
  voluntar: { nume: string; dataInscriere: string | null };
  panou: { distribuiri: number; campanii: string[]; prima: string | null; ultima: string | null };
  sarcini: { finalizate: number; texte: string[] };
};

const text = (x: unknown) => (typeof x === "string" ? x : "");

export const obtineDateAdeverinta = withOrgSession(async (ctx, voluntarId: string): Promise<DateAdeverinta | null> => {
  if (typeof voluntarId !== "string" || voluntarId.length === 0 || voluntarId.length > 100) return null;
  const [roster] = await ctx.db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, "voluntari-roster"))).limit(1);
  const v = ((roster?.data as { volunteers?: Record<string, unknown>[] } | undefined)?.volunteers ?? []).find((x) => x && x.id === voluntarId);
  if (!v) return null;

  const [distrib, titluri] = await Promise.all([
    ctx.db
      .select({
        n: sql<number>`count(${volunteerShares.id})::int`,
        prima: sql<string | null>`min(${volunteerShares.ziua})::text`,
        ultima: sql<string | null>`max(${volunteerShares.ziua})::text`,
      })
      .from(volunteerShares)
      .innerJoin(volunteerVisitors, eq(volunteerVisitors.id, volunteerShares.visitorId))
      .where(and(eq(volunteerVisitors.orgId, ctx.orgId), eq(volunteerVisitors.voluntarId, voluntarId))),
    ctx.db
      .selectDistinct({ titlu: fundraisingPages.titlu })
      .from(volunteerShares)
      .innerJoin(volunteerVisitors, eq(volunteerVisitors.id, volunteerShares.visitorId))
      .innerJoin(fundraisingPages, eq(fundraisingPages.id, volunteerShares.campaignPageId))
      .where(and(eq(volunteerVisitors.orgId, ctx.orgId), eq(volunteerVisitors.voluntarId, voluntarId)))
      .limit(12),
  ]);

  const [taskuri] = await ctx.db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, "voluntari-tasks"))).limit(1);
  const ale = ((taskuri?.data as { tasks?: Record<string, unknown>[] } | undefined)?.tasks ?? []).filter((t) => t && t.voluntarId === voluntarId && t.done === true);

  return {
    org: { nume: ctx.orgName, cif: ctx.orgCif, adresa: ctx.orgAdresaSediu },
    voluntar: { nume: text(v.nume), dataInscriere: text(v.dataInscriere) || null },
    panou: { distribuiri: distrib[0]?.n ?? 0, campanii: titluri.map((t) => t.titlu), prima: distrib[0]?.prima ?? null, ultima: distrib[0]?.ultima ?? null },
    sarcini: { finalizate: ale.length, texte: ale.slice(0, 8).map((t) => text(t.text).slice(0, 140)).filter(Boolean) },
  };
});
