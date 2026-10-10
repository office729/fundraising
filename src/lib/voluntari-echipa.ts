import "server-only";

import { and, asc, desc, eq, lt, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import {
  fundraisingPages,
  volunteerActivities,
  volunteerPanelLinks,
  volunteerReports,
  volunteerShifts,
  volunteerSignups,
  volunteerTaskEngagements,
  volunteerTasks,
  volunteerVisitors,
} from "@/lib/db/schema";
import { listaCanale, STATUSURI_CARE_OCUPA_LOC, statusVoluntar, type StatusVoluntar } from "@/lib/voluntari-activitati";
import { ziuaRo } from "@/lib/voluntari-panou";
import { URL_BAZA } from "@/lib/voluntari-panou-server";

// Citirea datelor paginii „Voluntari” a echipei: sarcini online, activități pe teren, voluntari, raportări și cifrele panoului.
// Separat de acțiunile de server (primește orgId), ca să nu poată fi apelat din browser.

export type SarcinaEchipa = {
  id: string;
  titlu: string;
  descriere: string;
  tip: string;
  tipPersonalizat: string;
  campanieId: string | null;
  campanieTitlu: string | null;
  textRecomandat: string;
  linkBaza: string;
  imagineUrl: string;
  canale: string[];
  inceputLa: string | null;
  termen: string | null;
  nrVoluntari: number | null;
  minuteEstimate: number | null;
  instructiuni: string;
  stare: string;
  angajati: number;
  finalizate: number;
};

export type TuraEchipa = { id: string; nume: string; inceputLa: string; seTerminaLa: string; locuri: number; ocupate: number };
export type InscrisEchipa = {
  id: string;
  voluntar: string;
  telefon: string | null;
  email: string | null;
  turaId: string;
  tura: string;
  status: string;
  oreCalculate: number | null;
  oreValidate: number | null;
};
export type ActivitateEchipa = {
  id: string;
  titlu: string;
  descriere: string;
  locatie: string;
  localitate: string;
  inceputLa: string;
  seTerminaLa: string;
  coordonatorNume: string;
  coordonatorTelefon: string;
  aprobare: string;
  cerinte: string;
  instructiuni: string;
  contactZi: string;
  cuMinori: boolean;
  rezultatEticheta: string;
  rezultatValoare: number | null;
  stare: string;
  linkCoordonator: string | null;
  ture: TuraEchipa[];
  inscrisi: InscrisEchipa[];
};

export type VoluntarEchipa = {
  id: string;
  prenume: string;
  telefon: string | null;
  email: string | null;
  status: StatusVoluntar;
  intratLa: string;
  ultimaActiuneLa: string | null;
  sarciniFinalizate: number;
  activitatiPrezent: number;
  oreValidate: number;
  distribuiri: number;
};

export type RaportareEchipa = { id: string; descriere: string; stare: string; creataLa: string; voluntar: string | null; activitate: string | null };

export type DateVoluntari = {
  acumIso: string; // momentul citirii (serverul), ca pagina să nu apeleze Date.now() la randare
  azi: string; // ziua după ora României, YYYY-MM-DD
  link: { url: string; activ: boolean } | null;
  campanii: { id: string; titlu: string; slug: string }[];
  cifre: {
    voluntariTotal: number;
    voluntariActivi: number;
    sarciniDeschise: number;
    sarciniFinalizate: number;
    activitatiViitoare: number;
    locuriLibere: number;
    inscrieriViitoare: number;
    oreValidate: number;
    prezentaProcent: number | null;
  };
  atentie: {
    inscrieriFaraRaspuns: number;
    activitatiCuLocuriLibere: { id: string; titlu: string; libere: number }[];
    sarciniCareExpira: { id: string; titlu: string; termen: string }[];
    activitatiDeValidat: { id: string; titlu: string }[];
    raportariNoi: number;
  };
  sarcini: SarcinaEchipa[];
  activitati: ActivitateEchipa[];
  voluntari: VoluntarEchipa[];
  raportari: RaportareEchipa[];
};

const num = (v: string | number | null | undefined): number | null => (v == null ? null : Number(v));

export async function citesteDateVoluntari(ctx: { db: OrgContext["db"]; orgId: string }): Promise<DateVoluntari> {
  const { db, orgId } = ctx;
  const azi = ziuaRo();
  const acum = new Date();

  const [linkRand] = await db.select({ cod: volunteerPanelLinks.cod, activ: volunteerPanelLinks.activ }).from(volunteerPanelLinks).where(eq(volunteerPanelLinks.orgId, orgId)).limit(1);

  const campanii = await db
    .select({ id: fundraisingPages.id, titlu: fundraisingPages.titlu, slug: fundraisingPages.slug })
    .from(fundraisingPages)
    .where(and(eq(fundraisingPages.orgId, orgId), eq(fundraisingPages.status, "activa")))
    .orderBy(desc(fundraisingPages.createdAt));
  const titluCampanie = new Map(campanii.map((c) => [c.id, c.titlu]));

  // ===== Sarcini =====
  const randuriSarcini = await db.select().from(volunteerTasks).where(eq(volunteerTasks.orgId, orgId)).orderBy(desc(volunteerTasks.createdAt));
  const implicari = await db
    .select({
      taskId: volunteerTaskEngagements.taskId,
      angajati: sql<number>`count(*) filter (where ${volunteerTaskEngagements.stare} <> 'renuntat')::int`,
      finalizate: sql<number>`count(*) filter (where ${volunteerTaskEngagements.stare} = 'finalizat')::int`,
    })
    .from(volunteerTaskEngagements)
    .where(eq(volunteerTaskEngagements.orgId, orgId))
    .groupBy(volunteerTaskEngagements.taskId);
  const implicariPeSarcina = new Map(implicari.map((i) => [i.taskId, i]));
  const sarcini: SarcinaEchipa[] = randuriSarcini.map((s) => ({
    id: s.id,
    titlu: s.titlu,
    descriere: s.descriere,
    tip: s.tip,
    tipPersonalizat: s.tipPersonalizat ?? "",
    campanieId: s.campaignPageId,
    campanieTitlu: s.campaignPageId ? (titluCampanie.get(s.campaignPageId) ?? null) : null,
    textRecomandat: s.textRecomandat ?? "",
    linkBaza: s.linkBaza ?? "",
    imagineUrl: s.imagineUrl ?? "",
    canale: listaCanale(s.canale),
    inceputLa: s.inceputLa,
    termen: s.termen,
    nrVoluntari: s.nrVoluntari,
    minuteEstimate: s.minuteEstimate,
    instructiuni: s.instructiuni ?? "",
    stare: s.stare,
    angajati: implicariPeSarcina.get(s.id)?.angajati ?? 0,
    finalizate: implicariPeSarcina.get(s.id)?.finalizate ?? 0,
  }));

  // ===== Activități =====
  const randuriActivitati = await db.select().from(volunteerActivities).where(eq(volunteerActivities.orgId, orgId)).orderBy(desc(volunteerActivities.inceputLa)).limit(200);
  const ture = await db.select().from(volunteerShifts).where(eq(volunteerShifts.orgId, orgId)).orderBy(asc(volunteerShifts.inceputLa));
  const inscrieri = await db
    .select({
      id: volunteerSignups.id,
      activityId: volunteerSignups.activityId,
      shiftId: volunteerSignups.shiftId,
      status: volunteerSignups.status,
      oreCalculate: volunteerSignups.oreCalculate,
      oreValidate: volunteerSignups.oreValidate,
      prenume: volunteerVisitors.prenume,
      telefon: volunteerVisitors.telefon,
      email: volunteerVisitors.email,
    })
    .from(volunteerSignups)
    .innerJoin(volunteerVisitors, eq(volunteerVisitors.id, volunteerSignups.visitorId))
    .where(eq(volunteerSignups.orgId, orgId))
    .orderBy(asc(volunteerSignups.createdAt));

  const ocupatePeTura = new Map<string, number>();
  for (const i of inscrieri) if ((STATUSURI_CARE_OCUPA_LOC as string[]).includes(i.status)) ocupatePeTura.set(i.shiftId, (ocupatePeTura.get(i.shiftId) ?? 0) + 1);
  const numeTura = new Map(ture.map((t) => [t.id, t.nume]));

  const activitati: ActivitateEchipa[] = randuriActivitati.map((a) => ({
    id: a.id,
    titlu: a.titlu,
    descriere: a.descriere ?? "",
    locatie: a.locatie,
    localitate: a.localitate ?? "",
    inceputLa: a.inceputLa.toISOString(),
    seTerminaLa: a.seTerminaLa.toISOString(),
    coordonatorNume: a.coordonatorNume ?? "",
    coordonatorTelefon: a.coordonatorTelefon ?? "",
    aprobare: a.aprobare,
    cerinte: a.cerinte ?? "",
    instructiuni: a.instructiuni ?? "",
    contactZi: a.contactZi ?? "",
    cuMinori: a.cuMinori,
    rezultatEticheta: a.rezultatEticheta ?? "",
    rezultatValoare: num(a.rezultatValoare),
    stare: a.stare,
    linkCoordonator: a.coordinatorToken ? `${URL_BAZA()}/coordonator/${a.coordinatorToken}` : null,
    ture: ture
      .filter((t) => t.activityId === a.id)
      .map((t) => ({ id: t.id, nume: t.nume, inceputLa: t.inceputLa.toISOString(), seTerminaLa: t.seTerminaLa.toISOString(), locuri: t.locuri, ocupate: ocupatePeTura.get(t.id) ?? 0 })),
    inscrisi: inscrieri
      .filter((i) => i.activityId === a.id)
      .map((i) => ({
        id: i.id,
        voluntar: i.prenume,
        telefon: i.telefon,
        email: i.email,
        turaId: i.shiftId,
        tura: numeTura.get(i.shiftId) ?? "Voluntar",
        status: i.status,
        oreCalculate: num(i.oreCalculate),
        oreValidate: num(i.oreValidate),
      })),
  }));

  // ===== Voluntari =====
  // În subinterogări referința la voluntar e scrisă explicit: într-un select fără join, Drizzle ar scoate prefixul tabelei și „id” ar însemna
  // coloana subinterogării.
  const vizitatori = await db
    .select({
      id: volunteerVisitors.id,
      prenume: volunteerVisitors.prenume,
      telefon: volunteerVisitors.telefon,
      email: volunteerVisitors.email,
      intratLa: volunteerVisitors.createdAt,
      distribuiri: sql<number>`(select count(*)::int from volunteer_shares s where s.visitor_id = "volunteer_visitors"."id")`,
      ultimaDistribuire: sql<Date | null>`(select max(s.created_at) from volunteer_shares s where s.visitor_id = "volunteer_visitors"."id")`,
      sarciniFinalizate: sql<number>`(select count(*)::int from volunteer_task_engagements e where e.visitor_id = "volunteer_visitors"."id" and e.stare = 'finalizat')`,
      ultimaSarcina: sql<Date | null>`(select max(e.finalizat_la) from volunteer_task_engagements e where e.visitor_id = "volunteer_visitors"."id" and e.stare = 'finalizat')`,
      activitatiPrezent: sql<number>`(select count(*)::int from volunteer_signups g where g.visitor_id = "volunteer_visitors"."id" and g.status = 'prezent')`,
      ultimaPrezenta: sql<Date | null>`(select max(g.updated_at) from volunteer_signups g where g.visitor_id = "volunteer_visitors"."id" and g.status = 'prezent')`,
      oreValidate: sql<string>`coalesce((select sum(g.ore_validate) from volunteer_signups g where g.visitor_id = "volunteer_visitors"."id" and g.ore_validate is not null), 0)`,
    })
    .from(volunteerVisitors)
    .where(eq(volunteerVisitors.orgId, orgId))
    .orderBy(desc(volunteerVisitors.ultimaActivitateLa))
    .limit(500);

  const voluntari: VoluntarEchipa[] = vizitatori.map((v) => {
    const momente = [v.ultimaDistribuire, v.ultimaSarcina, v.ultimaPrezenta].filter((x): x is Date => x != null).map((x) => new Date(x));
    const ultima = momente.length ? new Date(Math.max(...momente.map((m) => m.getTime()))) : null;
    return {
      id: v.id,
      prenume: v.prenume,
      telefon: v.telefon,
      email: v.email,
      status: statusVoluntar(ultima, acum),
      intratLa: v.intratLa.toISOString(),
      ultimaActiuneLa: ultima ? ultima.toISOString() : null,
      sarciniFinalizate: v.sarciniFinalizate,
      activitatiPrezent: v.activitatiPrezent,
      oreValidate: Number(v.oreValidate),
      distribuiri: v.distribuiri,
    };
  });

  // ===== Raportări =====
  const randuriRaportari = await db
    .select({
      id: volunteerReports.id,
      descriere: volunteerReports.descriere,
      stare: volunteerReports.stare,
      creataLa: volunteerReports.createdAt,
      voluntar: volunteerVisitors.prenume,
      activitate: volunteerActivities.titlu,
    })
    .from(volunteerReports)
    .leftJoin(volunteerVisitors, eq(volunteerVisitors.id, volunteerReports.visitorId))
    .leftJoin(volunteerActivities, eq(volunteerActivities.id, volunteerReports.activityId))
    .where(eq(volunteerReports.orgId, orgId))
    .orderBy(desc(volunteerReports.createdAt))
    .limit(100);
  const raportari: RaportareEchipa[] = randuriRaportari.map((r) => ({ id: r.id, descriere: r.descriere, stare: r.stare, creataLa: r.creataLa.toISOString(), voluntar: r.voluntar, activitate: r.activitate }));

  // ===== Cifre și „atenție acum” =====
  const viitoare = activitati.filter((a) => a.stare === "publicata" && new Date(a.seTerminaLa) >= acum);
  const locuriLibere = (a: ActivitateEchipa) => a.ture.reduce((s, t) => s + Math.max(0, t.locuri - t.ocupate), 0);
  const prezenti = inscrieri.filter((i) => i.status === "prezent").length;
  const absenti = inscrieri.filter((i) => i.status === "absent").length;
  const limita14 = new Date(acum.getTime() + 14 * 86_400_000);
  const limita3 = new Date(`${azi}T00:00:00Z`).getTime() + 3 * 86_400_000;
  const dupa48h = acum.getTime() - 48 * 3_600_000;

  const inscrieriFaraRaspuns = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(volunteerSignups)
    .where(and(eq(volunteerSignups.orgId, orgId), eq(volunteerSignups.status, "in_asteptare"), lt(volunteerSignups.createdAt, new Date(dupa48h))));

  const voluntariActivi = voluntari.filter((v) => v.status === "activ").length;
  const sarciniFinalizate = sarcini.reduce((s, x) => s + x.finalizate, 0);

  return {
    acumIso: acum.toISOString(),
    azi,
    link: linkRand ? { url: `${URL_BAZA()}/voluntar/${linkRand.cod}`, activ: linkRand.activ } : null,
    campanii,
    cifre: {
      voluntariTotal: voluntari.length,
      voluntariActivi,
      sarciniDeschise: sarcini.filter((s) => s.stare === "publicata" && (!s.termen || s.termen >= azi)).length,
      sarciniFinalizate,
      activitatiViitoare: viitoare.length,
      locuriLibere: viitoare.reduce((s, a) => s + locuriLibere(a), 0),
      inscrieriViitoare: viitoare.reduce((s, a) => s + a.inscrisi.filter((i) => ["confirmata", "in_asteptare"].includes(i.status)).length, 0),
      oreValidate: inscrieri.reduce((s, i) => s + (num(i.oreValidate) ?? 0), 0),
      prezentaProcent: prezenti + absenti > 0 ? Math.round((prezenti / (prezenti + absenti)) * 100) : null,
    },
    atentie: {
      inscrieriFaraRaspuns: inscrieriFaraRaspuns[0]?.n ?? 0,
      activitatiCuLocuriLibere: viitoare
        .filter((a) => new Date(a.inceputLa) <= limita14 && locuriLibere(a) > 0)
        .map((a) => ({ id: a.id, titlu: a.titlu, libere: locuriLibere(a) })),
      sarciniCareExpira: sarcini
        .filter((s) => s.stare === "publicata" && s.termen && new Date(`${s.termen}T00:00:00Z`).getTime() <= limita3 && s.termen >= azi)
        .map((s) => ({ id: s.id, titlu: s.titlu, termen: s.termen! })),
      activitatiDeValidat: activitati
        .filter((a) => a.stare !== "anulata" && new Date(a.seTerminaLa) < acum && a.inscrisi.some((i) => i.status === "prezent" && i.oreValidate == null))
        .map((a) => ({ id: a.id, titlu: a.titlu })),
      raportariNoi: raportari.filter((r) => r.stare === "noua").length,
    },
    sarcini,
    activitati,
    voluntari,
    raportari,
  };
}

