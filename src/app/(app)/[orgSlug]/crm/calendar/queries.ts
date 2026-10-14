import { and, between, eq, isNotNull, isNull, notInArray } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { areModul } from "@/lib/billing/packages";
import { activitati, companies, fundraisingPages, granturi, volunteerActivities, volunteerShifts } from "@/lib/db/schema";
import { aziBucuresti } from "@/lib/granturi/stari";
import { evenimenteStatice, type EvenimentCalendar } from "@/lib/calendar-fundraising";

// Tot ce are o dată pentru organizație, într-un interval: termene de granturi și de raportare, sfârșituri de campanie, follow-up-uri la
// companii, ture de voluntari și termene interne, plus momentele de campanie și termenele fixe. Fiecare sursă apare doar dacă pachetul
// include modulul ei (altfel calendarul ar arăta date la care utilizatorul nu are acces).
export const obtineEvenimente = withOrgSession(async (ctx, de: string, pana: string): Promise<EvenimentCalendar[]> => {
  const base = `/${ctx.orgSlug}/crm`;
  const deTs = new Date(`${de}T00:00:00+03:00`);
  const panaTs = new Date(`${pana}T23:59:59+02:00`);
  const evenimente: EvenimentCalendar[] = [...evenimenteStatice(de, pana)];

  const [g, campanii, firme, ture, interne] = await Promise.all([
    areModul(ctx.orgPackage, "granturi")
      ? ctx.db
          .select({ id: granturi.id, titlu: granturi.titlu, finantator: granturi.finantator, stare: granturi.stare, termen: granturi.termen, termenRaportare: granturi.termenRaportare })
          .from(granturi)
          .where(eq(granturi.orgId, ctx.orgId))
      : Promise.resolve([]),
    ctx.db
      .select({ id: fundraisingPages.id, titlu: fundraisingPages.titlu, termen: fundraisingPages.termen })
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.orgId, ctx.orgId), eq(fundraisingPages.status, "activa"), isNotNull(fundraisingPages.termen), between(fundraisingPages.termen, de, pana))),
    ctx.db
      .select({ id: companies.id, nume: companies.nume, followupAt: companies.followupAt })
      .from(companies)
      .where(and(eq(companies.orgId, ctx.orgId), isNull(companies.deletedAt), eq(companies.status, "open"), between(companies.followupAt, deTs, panaTs)))
      .limit(150),
    areModul(ctx.orgPackage, "voluntari")
      ? ctx.db
          .select({ id: volunteerShifts.id, rol: volunteerShifts.nume, inceputLa: volunteerShifts.inceputLa, titlu: volunteerActivities.titlu })
          .from(volunteerShifts)
          .innerJoin(volunteerActivities, eq(volunteerActivities.id, volunteerShifts.activityId))
          .where(and(eq(volunteerShifts.orgId, ctx.orgId), eq(volunteerActivities.stare, "publicata"), between(volunteerShifts.inceputLa, deTs, panaTs)))
          .limit(150)
      : Promise.resolve([]),
    areModul(ctx.orgPackage, "kpi")
      ? ctx.db
          .select({ id: activitati.id, titlu: activitati.titlu, termen: activitati.termen })
          .from(activitati)
          .where(and(eq(activitati.orgId, ctx.orgId), isNotNull(activitati.termen), between(activitati.termen, de, pana), notInArray(activitati.status, ["finalizat", "anulat"])))
          .limit(150)
      : Promise.resolve([]),
  ]);

  for (const x of g) {
    if (x.termen && x.termen >= de && x.termen <= pana && ["identificat", "in_pregatire"].includes(x.stare)) {
      evenimente.push({ id: `grant-${x.id}`, data: x.termen, titlu: `Depunere: ${x.titlu}`, tip: "grant", href: `${base}/granturi`, detaliu: x.finantator });
    }
    if (x.termenRaportare && x.termenRaportare >= de && x.termenRaportare <= pana && ["castigat", "in_derulare"].includes(x.stare)) {
      evenimente.push({ id: `raportare-${x.id}`, data: x.termenRaportare, titlu: `Raport: ${x.titlu}`, tip: "raportare", href: `${base}/granturi`, detaliu: x.finantator });
    }
  }
  for (const c of campanii) {
    if (c.termen) evenimente.push({ id: `campanie-${c.id}`, data: c.termen, titlu: `Se încheie: ${c.titlu}`, tip: "campanie", href: `${base}/strangere-fonduri/${c.id}`, detaliu: null });
  }
  for (const f of firme) {
    if (f.followupAt) evenimente.push({ id: `followup-${f.id}`, data: aziBucuresti(f.followupAt), titlu: f.nume, tip: "followup", href: `${base}/companii/${f.id}`, detaliu: "Follow-up programat" });
  }
  for (const t of ture) {
    evenimente.push({ id: `tura-${t.id}`, data: aziBucuresti(t.inceputLa), titlu: t.titlu, tip: "voluntari", href: `${base}/voluntari`, detaliu: t.rol });
  }
  for (const a of interne) {
    if (a.termen) evenimente.push({ id: `activitate-${a.id}`, data: a.termen, titlu: a.titlu, tip: "obiectiv", href: `${base}/performanta`, detaliu: "Activitate cu termen" });
  }
  return evenimente;
});
