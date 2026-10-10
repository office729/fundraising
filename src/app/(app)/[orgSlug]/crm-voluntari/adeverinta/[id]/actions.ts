"use server";

import { and, asc, eq, sql } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import type { OrgContext } from "@/lib/auth/guard";
import { crmKv, fundraisingPages, volunteerActivities, volunteerShares, volunteerShifts, volunteerSignups, volunteerTaskEngagements, volunteerTasks, volunteerVisitors } from "@/lib/db/schema";

// Datele pentru adeverința de voluntariat: fișa din CRM Voluntari + activitatea din platformă (panou, sarcini îndeplinite).
export type DateAdeverinta = {
  org: { nume: string; cif: string | null; adresa: string | null };
  voluntar: { nume: string; dataInscriere: string | null };
  panou: { distribuiri: number; campanii: string[]; prima: string | null; ultima: string | null };
  sarcini: { finalizate: number; texte: string[] };
  // Activitățile pe teren cu ore VALIDATE de organizație (singurele care intră în adeverință).
  teren: { ore: number; activitati: { titlu: string; data: string; ore: number }[]; prima: string | null; ultima: string | null };
  // Numele complet nu e cunoscut când adeverința pornește de la un voluntar fără fișă în CRM (avem doar prenumele): se completează manual.
  numeComplet: boolean;
};

async function activitatiCuOreValidate(ctx: OrgContext, conditie: ReturnType<typeof eq>): Promise<DateAdeverinta["teren"]> {
  const randuri = await ctx.db
    .select({ titlu: volunteerActivities.titlu, data: volunteerShifts.inceputLa, ore: volunteerSignups.oreValidate })
    .from(volunteerSignups)
    .innerJoin(volunteerVisitors, eq(volunteerVisitors.id, volunteerSignups.visitorId))
    .innerJoin(volunteerActivities, eq(volunteerActivities.id, volunteerSignups.activityId))
    .innerJoin(volunteerShifts, eq(volunteerShifts.id, volunteerSignups.shiftId))
    .where(and(eq(volunteerSignups.orgId, ctx.orgId), sql`${volunteerSignups.oreValidate} is not null`, conditie))
    .orderBy(asc(volunteerShifts.inceputLa));
  const activitati = randuri.map((x) => ({ titlu: x.titlu, data: x.data.toLocaleDateString("sv-SE", { timeZone: "Europe/Bucharest" }), ore: Number(x.ore) }));
  return { ore: activitati.reduce((t, a) => t + a.ore, 0), activitati: activitati.slice(0, 12), prima: activitati[0]?.data ?? null, ultima: activitati.at(-1)?.data ?? null };
}

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
    teren: await activitatiCuOreValidate(ctx, eq(volunteerVisitors.voluntarId, voluntarId)),
    numeComplet: true,
  };
});

// Adeverință pornită direct din pagina „Voluntari”, pentru un voluntar care nu e (încă) în CRM Voluntari: știm doar prenumele.
export const obtineDateAdeverintaVoluntar = withOrgSession(async (ctx, visitorId: string): Promise<DateAdeverinta | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(String(visitorId))) return null;
  const [v] = await ctx.db
    .select({ id: volunteerVisitors.id, prenume: volunteerVisitors.prenume, intratLa: volunteerVisitors.createdAt })
    .from(volunteerVisitors)
    .where(and(eq(volunteerVisitors.id, visitorId), eq(volunteerVisitors.orgId, ctx.orgId)))
    .limit(1);
  if (!v) return null;
  const [distrib] = await ctx.db
    .select({ n: sql<number>`count(*)::int`, prima: sql<string | null>`min(${volunteerShares.ziua})::text`, ultima: sql<string | null>`max(${volunteerShares.ziua})::text` })
    .from(volunteerShares)
    .where(and(eq(volunteerShares.visitorId, visitorId), eq(volunteerShares.orgId, ctx.orgId)));
  const sarcini = await ctx.db
    .select({ titlu: volunteerTasks.titlu })
    .from(volunteerTaskEngagements)
    .innerJoin(volunteerTasks, eq(volunteerTasks.id, volunteerTaskEngagements.taskId))
    .where(and(eq(volunteerTaskEngagements.visitorId, visitorId), eq(volunteerTaskEngagements.orgId, ctx.orgId), eq(volunteerTaskEngagements.stare, "finalizat")))
    .limit(8);
  return {
    org: { nume: ctx.orgName, cif: ctx.orgCif, adresa: ctx.orgAdresaSediu },
    voluntar: { nume: v.prenume, dataInscriere: v.intratLa.toISOString().slice(0, 10) },
    panou: { distribuiri: distrib?.n ?? 0, campanii: [], prima: distrib?.prima ?? null, ultima: distrib?.ultima ?? null },
    sarcini: { finalizate: sarcini.length, texte: sarcini.map((t) => t.titlu.slice(0, 140)) },
    teren: await activitatiCuOreValidate(ctx, eq(volunteerVisitors.id, visitorId)),
    numeComplet: false,
  };
});
