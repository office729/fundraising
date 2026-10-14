import "server-only";

import { and, eq, isNull, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { activitati, angajati, companies, donatoriReali, fundraisingPressReleases, granturi, memberships, obiective, volunteerActivities, volunteerTasks } from "@/lib/db/schema";

import type { ModulPachet, UtilizarePachet } from "./packages";

// Ce a folosit organizația în perioada de probă, ca să-i recomandăm pachetul potrivit (vezi recomandaPachet în packages.ts). Doar numărători și
// „există ceva în modul”: nu citim conținutul datelor. Modulele care nu lasă urme în baza de date (Program de lucru, Calendar, Analiza bazei,
// Instrumentele de design) nu se pot deduce, deci nu intră în calcul; paginile pachetelor arată ce include fiecare.
export async function masoaraUtilizarea(ctx: Pick<OrgContext, "db" | "orgId">): Promise<UtilizarePachet> {
  const n = sql<number>`count(*)`.mapWith(Number);
  const [[membri], [pf], [pj], [obi], [ang], [act], [sarcini], [activVol], [presa], [grant]] = await Promise.all([
    ctx.db.select({ n }).from(memberships).where(eq(memberships.orgId, ctx.orgId)),
    ctx.db.select({ n }).from(donatoriReali).where(eq(donatoriReali.orgId, ctx.orgId)),
    ctx.db.select({ n }).from(companies).where(and(eq(companies.orgId, ctx.orgId), isNull(companies.deletedAt))),
    ctx.db.select({ n }).from(obiective).where(eq(obiective.orgId, ctx.orgId)),
    ctx.db.select({ n }).from(angajati).where(eq(angajati.orgId, ctx.orgId)),
    ctx.db.select({ n }).from(activitati).where(eq(activitati.orgId, ctx.orgId)),
    ctx.db.select({ n }).from(volunteerTasks).where(eq(volunteerTasks.orgId, ctx.orgId)),
    ctx.db.select({ n }).from(volunteerActivities).where(eq(volunteerActivities.orgId, ctx.orgId)),
    ctx.db.select({ n }).from(fundraisingPressReleases).where(eq(fundraisingPressReleases.orgId, ctx.orgId)),
    ctx.db.select({ n }).from(granturi).where(eq(granturi.orgId, ctx.orgId)),
  ]);
  const folosite: ModulPachet[] = [];
  if (obi.n + ang.n + act.n > 0) folosite.push("kpi");
  if (sarcini.n + activVol.n > 0) folosite.push("voluntari");
  if (presa.n > 0) folosite.push("comunicat-presa");
  if (grant.n > 0) folosite.push("granturi");
  return { utilizatori: Math.max(1, membri.n), contactePf: pf.n, companiiPj: pj.n, module: folosite };
}
