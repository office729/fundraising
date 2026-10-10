import { caleCampanie } from "@/lib/link-campanie";
import "server-only";

import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";

import type { Tx } from "@/lib/db";
import {
  fundraisingPages,
  volunteerActivities,
  volunteerShifts,
  volunteerSignups,
  volunteerTaskEngagements,
  volunteerTasks,
} from "@/lib/db/schema";
import { listaCanale, sarcinaDeschisa, STATUSURI_CARE_OCUPA_LOC } from "@/lib/voluntari-activitati";
import { URL_BAZA } from "@/lib/voluntari-panou-server";

// Datele pe care le vede un voluntar pe pagina lui publică (după codul linkului și cookie). Citirile rulează într-o tranzacție cu
// app.current_org_id setat de server (vezi cuOrg). Se scot doar câmpurile necesare: contactul coordonatorului apare numai celor confirmați.

export type SarcinaPublica = {
  id: string;
  titlu: string;
  descriere: string;
  tip: string;
  tipPersonalizat: string | null;
  campanieTitlu: string | null;
  textRecomandat: string;
  linkBaza: string | null; // linkul de distribuit (cel ales de echipă sau pagina campaniei)
  campanieSlug: string | null;
  imagineUrl: string | null;
  canale: string[];
  termen: string | null;
  minuteEstimate: number | null;
  instructiuni: string;
  locuriRamase: number | null;
  stareMea: "angajat" | "finalizat" | null;
  linkPostareMeu: string | null;
};

export async function sarciniPentruVoluntar(tx: Tx, orgId: string, orgSlug: string, visitorId: string, azi: string): Promise<SarcinaPublica[]> {
  const randuri = await tx
    .select({
      id: volunteerTasks.id,
      titlu: volunteerTasks.titlu,
      descriere: volunteerTasks.descriere,
      tip: volunteerTasks.tip,
      tipPersonalizat: volunteerTasks.tipPersonalizat,
      stare: volunteerTasks.stare,
      textRecomandat: volunteerTasks.textRecomandat,
      linkBaza: volunteerTasks.linkBaza,
      imagineUrl: volunteerTasks.imagineUrl,
      canale: volunteerTasks.canale,
      inceputLa: volunteerTasks.inceputLa,
      termen: volunteerTasks.termen,
      nrVoluntari: volunteerTasks.nrVoluntari,
      minute: volunteerTasks.minuteEstimate,
      instructiuni: volunteerTasks.instructiuni,
      campanieTitlu: fundraisingPages.titlu,
      campanieSlug: fundraisingPages.slug,
      finalizari: sql<number>`(select count(*)::int from volunteer_task_engagements e where e.task_id = ${volunteerTasks.id} and e.stare = 'finalizat')`,
    })
    .from(volunteerTasks)
    .leftJoin(fundraisingPages, eq(fundraisingPages.id, volunteerTasks.campaignPageId))
    .where(and(eq(volunteerTasks.orgId, orgId), eq(volunteerTasks.stare, "publicata")))
    .orderBy(sql`${volunteerTasks.termen} asc nulls last`, desc(volunteerTasks.createdAt));

  const ale = await tx
    .select({ taskId: volunteerTaskEngagements.taskId, stare: volunteerTaskEngagements.stare, linkPostare: volunteerTaskEngagements.linkPostare })
    .from(volunteerTaskEngagements)
    .where(and(eq(volunteerTaskEngagements.orgId, orgId), eq(volunteerTaskEngagements.visitorId, visitorId)));
  const dupaSarcina = new Map(ale.map((a) => [a.taskId, a]));

  const iesire: SarcinaPublica[] = [];
  for (const s of randuri) {
    const mea = dupaSarcina.get(s.id);
    const deschisa = sarcinaDeschisa({ stare: s.stare, inceputLa: s.inceputLa, termen: s.termen, nrVoluntari: s.nrVoluntari, finalizari: s.finalizari }, azi);
    // Sarcinile închise se ascund, cu excepția celor la care voluntarul s-a implicat (le vede ca „făcute”).
    if (!deschisa && !(mea && mea.stare !== "renuntat")) continue;
    iesire.push({
      id: s.id,
      titlu: s.titlu,
      descriere: s.descriere,
      tip: s.tip,
      tipPersonalizat: s.tipPersonalizat,
      campanieTitlu: s.campanieTitlu,
      campanieSlug: s.campanieSlug,
      textRecomandat: s.textRecomandat ?? "",
      linkBaza: s.linkBaza ?? (s.campanieSlug ? `${URL_BAZA()}${caleCampanie(orgSlug, s.campanieSlug)}` : null),
      imagineUrl: s.imagineUrl,
      canale: listaCanale(s.canale),
      termen: s.termen,
      minuteEstimate: s.minute,
      instructiuni: s.instructiuni ?? "",
      locuriRamase: s.nrVoluntari != null ? Math.max(0, s.nrVoluntari - s.finalizari) : null,
      stareMea: mea && mea.stare !== "renuntat" ? (mea.stare as "angajat" | "finalizat") : null,
      linkPostareMeu: mea?.linkPostare ?? null,
    });
  }
  return iesire;
}

export type TuraPublica = {
  id: string;
  nume: string;
  inceputLa: string;
  seTerminaLa: string;
  locuri: number;
  ocupate: number;
  inscrierea: { id: string; status: string } | null;
};
export type ActivitatePublica = {
  id: string;
  titlu: string;
  descriere: string;
  locatie: string;
  localitate: string;
  inceputLa: string;
  seTerminaLa: string;
  aprobare: string;
  cerinte: string;
  instructiuni: string;
  cuMinori: boolean;
  coordonator: { nume: string; telefon: string; contactZi: string } | null; // doar pentru cei confirmați
  ture: TuraPublica[];
};

export async function activitatiPentruVoluntar(tx: Tx, orgId: string, visitorId: string, acum: Date): Promise<ActivitatePublica[]> {
  const activitati = await tx
    .select()
    .from(volunteerActivities)
    .where(and(eq(volunteerActivities.orgId, orgId), eq(volunteerActivities.stare, "publicata"), gte(volunteerActivities.seTerminaLa, acum)))
    .orderBy(asc(volunteerActivities.inceputLa))
    .limit(60);
  if (activitati.length === 0) return [];
  const ture = await tx.select().from(volunteerShifts).where(eq(volunteerShifts.orgId, orgId)).orderBy(asc(volunteerShifts.inceputLa));
  const ocupari = await tx
    .select({ shiftId: volunteerSignups.shiftId, n: sql<number>`count(*)::int` })
    .from(volunteerSignups)
    .where(and(eq(volunteerSignups.orgId, orgId), inArray(volunteerSignups.status, STATUSURI_CARE_OCUPA_LOC)))
    .groupBy(volunteerSignups.shiftId);
  const ocupate = new Map(ocupari.map((o) => [o.shiftId, o.n]));
  const mele = await tx
    .select({ id: volunteerSignups.id, shiftId: volunteerSignups.shiftId, activityId: volunteerSignups.activityId, status: volunteerSignups.status })
    .from(volunteerSignups)
    .where(and(eq(volunteerSignups.orgId, orgId), eq(volunteerSignups.visitorId, visitorId)));
  const dupaTura = new Map(mele.map((m) => [m.shiftId, m]));

  return activitati.map((a) => {
    const turileMele = ture.filter((t) => t.activityId === a.id).map((t) => ({ t, m: dupaTura.get(t.id) }));
    const confirmat = turileMele.some(({ m }) => m && ["confirmata", "prezent"].includes(m.status));
    return {
      id: a.id,
      titlu: a.titlu,
      descriere: a.descriere ?? "",
      locatie: a.locatie,
      localitate: a.localitate ?? "",
      inceputLa: a.inceputLa.toISOString(),
      seTerminaLa: a.seTerminaLa.toISOString(),
      aprobare: a.aprobare,
      cerinte: a.cerinte ?? "",
      instructiuni: a.instructiuni ?? "",
      cuMinori: a.cuMinori,
      coordonator: confirmat ? { nume: a.coordonatorNume ?? "", telefon: a.coordonatorTelefon ?? "", contactZi: a.contactZi ?? "" } : null,
      ture: turileMele.map(({ t, m }) => ({
        id: t.id,
        nume: t.nume,
        inceputLa: t.inceputLa.toISOString(),
        seTerminaLa: t.seTerminaLa.toISOString(),
        locuri: t.locuri,
        ocupate: ocupate.get(t.id) ?? 0,
        inscrierea: m && m.status !== "anulata" ? { id: m.id, status: m.status } : null,
      })),
    };
  });
}

export type IstoricVoluntar = {
  ore: number;
  activitati: number;
  sarcini: number;
  inscrieri: { id: string; activitate: string; inceputLa: string; status: string; ore: number | null }[];
};

export async function istoricPentruVoluntar(tx: Tx, orgId: string, visitorId: string): Promise<IstoricVoluntar> {
  const inscrieri = await tx
    .select({
      id: volunteerSignups.id,
      status: volunteerSignups.status,
      oreValidate: volunteerSignups.oreValidate,
      activitate: volunteerActivities.titlu,
      inceputLa: volunteerShifts.inceputLa,
    })
    .from(volunteerSignups)
    .innerJoin(volunteerActivities, eq(volunteerActivities.id, volunteerSignups.activityId))
    .innerJoin(volunteerShifts, eq(volunteerShifts.id, volunteerSignups.shiftId))
    .where(and(eq(volunteerSignups.orgId, orgId), eq(volunteerSignups.visitorId, visitorId)))
    .orderBy(desc(volunteerShifts.inceputLa))
    .limit(50);
  const [sarcini] = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(volunteerTaskEngagements)
    .where(and(eq(volunteerTaskEngagements.orgId, orgId), eq(volunteerTaskEngagements.visitorId, visitorId), eq(volunteerTaskEngagements.stare, "finalizat")));
  return {
    ore: inscrieri.reduce((s, i) => s + (i.oreValidate != null ? Number(i.oreValidate) : 0), 0),
    activitati: inscrieri.filter((i) => i.status === "prezent").length,
    sarcini: sarcini?.n ?? 0,
    inscrieri: inscrieri.map((i) => ({ id: i.id, activitate: i.activitate, inceputLa: i.inceputLa.toISOString(), status: i.status, ore: i.oreValidate != null ? Number(i.oreValidate) : null })),
  };
}
