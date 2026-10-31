"use server";

import { and, eq, inArray, sql } from "drizzle-orm";

import { type OrgContext } from "@/lib/auth/guard";
import { guardModul } from "@/lib/auth/guard-modul";
import { getLimiteleEfective, mesajeCote } from "@/lib/billing/quota";
import type { Tx } from "@/lib/db";
import { fundraisingAuditLog, fundraisingPages, volunteerActivities, volunteerPanelLinks, volunteerReports, volunteerShifts, volunteerSignups, volunteerTasks, volunteerVisitors } from "@/lib/db/schema";
import { emailConfigurat, trimiteEmail } from "@/lib/email";
import { getLocale } from "@/lib/i18n/get-locale";
import { getTr } from "@/lib/i18n/tr-server";
import { emailInvitatie } from "@/lib/voluntari-email-template";
import { candidatiPentru, MAX_INVITATII, type CandidatInvitatie } from "@/lib/voluntari-invitatii";
export type { CandidatInvitatie } from "@/lib/voluntari-invitatii";
import {
  calculeazaOre,
  dinOraRo,
  esteTipSarcina,
  MAX,
  MAX_TIP_PERSONALIZAT,
  normalizeazaLink,
  textCurat,
  UUID_REGEX,
} from "@/lib/voluntari-activitati";
import { genereazaCodScurt } from "@/lib/short-code";
import { CANAL_IDS } from "@/lib/voluntari-panou";
import { URL_BAZA } from "@/lib/voluntari-panou-server";
import { blocheazaTura, locuriOcupate, promoveazaDinRezerva } from "@/lib/voluntari-inscrieri";
import { citesteDateVoluntari, type DateVoluntari } from "@/lib/voluntari-echipa";

const { withOrgSession } = guardModul("voluntari");
export type { ActivitateEchipa, DateVoluntari, InscrisEchipa, RaportareEchipa, SarcinaEchipa, TuraEchipa, VoluntarEchipa } from "@/lib/voluntari-echipa";

// Acțiunile echipei pe pagina „Voluntari”. Orice membru al organizației coordonează (ca în CRM Voluntari); schimbările importante
// intră în jurnalul de audit. Erorile sunt mesaje scurte, pe înțelesul utilizatorului.

type Rez<T = object> = ({ ok: true } & T) | { ok: false; eroare: string };
const eroare = (m: string) => ({ ok: false as const, eroare: m });
const DATA = /^\d{4}-\d{2}-\d{2}$/;

const audit = (ctx: OrgContext, actiune: string, entitateId: string, detalii: Record<string, unknown> = {}) =>
  ctx.db.insert(fundraisingAuditLog).values({ orgId: ctx.orgId, actorAppUserId: ctx.userId, actiune, entitate: "voluntari", entitateId, detalii });

export const obtineDateVoluntari = withOrgSession(async (ctx): Promise<DateVoluntari> => citesteDateVoluntari(ctx));

// ===== Sarcini online =====
export type SarcinaInput = {
  id?: string;
  titlu: string;
  descriere: string;
  tip: string;
  tipPersonalizat: string;
  campanieId: string | null;
  textRecomandat: string;
  linkBaza: string;
  imagineUrl: string;
  canale: string[];
  inceputLa: string;
  termen: string;
  nrVoluntari: number | null;
  minuteEstimate: number | null;
  instructiuni: string;
  stare: "ciorna" | "publicata";
};

const intPozitiv = (v: unknown, max: number): number | null => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : null;
};

export const salveazaSarcinaAction = withOrgSession(async (ctx, i: SarcinaInput): Promise<Rez<{ id: string }>> => {
  const t = await getTr();
  const titlu = textCurat(i.titlu, MAX.titlu);
  const descriere = textCurat(i.descriere, MAX.descriere);
  if (titlu.length < 3) return eroare(t("Scrie un titlu (cel puțin 3 caractere).", "Write a title (at least 3 characters)."));
  if (descriere.length < 5) return eroare(t("Spune pe scurt ce trebuie făcut.", "Briefly say what needs to be done."));
  if (!esteTipSarcina(i.tip)) return eroare(t("Alege tipul sarcinii.", "Choose the task type."));
  const termen = String(i.termen ?? "");
  if (!DATA.test(termen)) return eroare(t("Alege un termen.", "Choose a deadline."));
  const inceput = String(i.inceputLa ?? "");
  if (inceput && !DATA.test(inceput)) return eroare(t("Data de început nu e validă.", "The start date is not valid."));
  if (inceput && inceput > termen) return eroare(t("Data de început trebuie să fie înainte de termen.", "The start date must be before the deadline."));

  let campanieId: string | null = null;
  if (i.campanieId) {
    if (!UUID_REGEX.test(i.campanieId)) return eroare(t("Campania aleasă nu e validă.", "The chosen campaign is not valid."));
    const [c] = await ctx.db.select({ id: fundraisingPages.id }).from(fundraisingPages).where(and(eq(fundraisingPages.id, i.campanieId), eq(fundraisingPages.orgId, ctx.orgId))).limit(1);
    if (!c) return eroare(t("Campania aleasă nu mai există.", "The chosen campaign no longer exists."));
    campanieId = c.id;
  }
  const linkBrut = String(i.linkBaza ?? "").trim();
  const linkBaza = linkBrut ? normalizeazaLink(linkBrut) : null;
  if (linkBrut && !linkBaza) return eroare(t("Linkul trebuie să înceapă cu https://.", "The link must start with https://."));
  const imgBrut = String(i.imagineUrl ?? "").trim();
  const imagineUrl = imgBrut ? normalizeazaLink(imgBrut) : null;
  if (imgBrut && !imagineUrl) return eroare(t("Linkul imaginii trebuie să înceapă cu https://.", "The image link must start with https://."));

  const valori = {
    titlu,
    descriere,
    tip: i.tip,
    tipPersonalizat: i.tip === "altceva" ? textCurat(i.tipPersonalizat, MAX_TIP_PERSONALIZAT) || null : null,
    campaignPageId: campanieId,
    textRecomandat: textCurat(i.textRecomandat, MAX.text) || null,
    linkBaza,
    imagineUrl,
    canale: [...new Set((Array.isArray(i.canale) ? i.canale : []).filter((c) => (CANAL_IDS as string[]).includes(c)))].join(","),
    inceputLa: inceput || null,
    termen,
    nrVoluntari: intPozitiv(i.nrVoluntari, 5000),
    minuteEstimate: intPozitiv(i.minuteEstimate, 600),
    instructiuni: textCurat(i.instructiuni, MAX.instructiuni) || null,
    stare: i.stare === "ciorna" ? "ciorna" : "publicata",
    updatedAt: new Date(),
  };

  if (i.id) {
    if (!UUID_REGEX.test(i.id)) return eroare(t("Sarcină invalidă.", "Invalid task."));
    const r = await ctx.db.update(volunteerTasks).set(valori).where(and(eq(volunteerTasks.id, i.id), eq(volunteerTasks.orgId, ctx.orgId))).returning({ id: volunteerTasks.id });
    if (!r[0]) return eroare(t("Sarcina nu mai există.", "The task no longer exists."));
    return { ok: true, id: r[0].id };
  }
  const [nou] = await ctx.db.insert(volunteerTasks).values({ ...valori, orgId: ctx.orgId, createdBy: ctx.userId }).returning({ id: volunteerTasks.id });
  await audit(ctx, "voluntari_sarcina_creata", nou.id, { titlu });
  return { ok: true, id: nou.id };
});

export const seteazaStareSarcinaAction = withOrgSession(async (ctx, id: string, stare: "publicata" | "inchisa"): Promise<Rez> => {
  const t = await getTr();
  if (!UUID_REGEX.test(String(id)) || !["publicata", "inchisa"].includes(stare)) return eroare(t("Cerere invalidă.", "Invalid request."));
  const r = await ctx.db.update(volunteerTasks).set({ stare, updatedAt: new Date() }).where(and(eq(volunteerTasks.id, id), eq(volunteerTasks.orgId, ctx.orgId))).returning({ id: volunteerTasks.id });
  return r[0] ? { ok: true } : eroare(t("Sarcina nu mai există.", "The task no longer exists."));
});

export const stergeSarcinaAction = withOrgSession(async (ctx, id: string): Promise<Rez> => {
  const t = await getTr();
  if (!UUID_REGEX.test(String(id))) return eroare(t("Cerere invalidă.", "Invalid request."));
  const r = await ctx.db.delete(volunteerTasks).where(and(eq(volunteerTasks.id, id), eq(volunteerTasks.orgId, ctx.orgId))).returning({ id: volunteerTasks.id });
  if (!r[0]) return eroare(t("Sarcina nu mai există.", "The task no longer exists."));
  await audit(ctx, "voluntari_sarcina_stearsa", id);
  return { ok: true };
});

// ===== Activități pe teren =====
export type TuraInput = { id?: string; nume: string; inceputLa: string; seTerminaLa: string; locuri: number };
export type ActivitateInput = {
  id?: string;
  titlu: string;
  descriere: string;
  locatie: string;
  localitate: string;
  inceputLa: string; // „2026-11-14T09:00”, ora României
  seTerminaLa: string;
  coordonatorNume: string;
  coordonatorTelefon: string;
  aprobare: "automata" | "manuala";
  cerinte: string;
  instructiuni: string;
  contactZi: string;
  cuMinori: boolean;
  rezultatEticheta: string;
  ture: TuraInput[];
  stare: "ciorna" | "publicata";
};

export const salveazaActivitateAction = withOrgSession(async (ctx, i: ActivitateInput): Promise<Rez<{ id: string }>> => {
  const locale = await getLocale();
  const t = await getTr();
  // Activitățile pe teren noi sunt incluse de la pachetul CREȘTERE; cele deja create se pot edita în continuare.
  if (!i.id && !getLimiteleEfective(ctx.orgPackage, ctx.orgCustomPlanConfig).voluntariActivitati) return eroare(mesajeCote.voluntariActivitati(ctx.orgPackage, locale));
  const titlu = textCurat(i.titlu, MAX.titlu);
  const locatie = textCurat(i.locatie, MAX.locatie);
  if (titlu.length < 3) return eroare(t("Scrie un titlu (cel puțin 3 caractere).", "Write a title (at least 3 characters)."));
  if (locatie.length < 3) return eroare(t("Scrie locul unde are loc activitatea.", "Write where the activity takes place."));
  const inceput = dinOraRo(i.inceputLa);
  const sfarsit = dinOraRo(i.seTerminaLa);
  if (!inceput || !sfarsit) return eroare(t("Alege data și ora de început și de sfârșit.", "Choose the start and end date and time."));
  if (sfarsit <= inceput) return eroare(t("Sfârșitul trebuie să fie după început.", "The end must be after the start."));
  if (!i.id && sfarsit.getTime() < Date.now()) return eroare(t("Activitatea trebuie să fie în viitor.", "The activity must be in the future."));

  const turiBrute = Array.isArray(i.ture) && i.ture.length > 0 ? i.ture : [{ nume: "Voluntar", inceputLa: i.inceputLa, seTerminaLa: i.seTerminaLa, locuri: 10 }];
  if (turiBrute.length > 20) return eroare(t("Cel mult 20 de ture sau roluri pe activitate.", "At most 20 shifts or roles per activity."));
  const turi: { id?: string; nume: string; inceputLa: Date; seTerminaLa: Date; locuri: number }[] = [];
  for (const tu of turiBrute) {
    const ti = dinOraRo(tu.inceputLa) ?? inceput;
    const ts = dinOraRo(tu.seTerminaLa) ?? sfarsit;
    if (ts <= ti) return eroare(locale === "en" ? `At “${textCurat(tu.nume, 40) || "Voluntar"}”, the end must be after the start.` : `La „${textCurat(tu.nume, 40) || "Voluntar"}”, sfârșitul trebuie să fie după început.`);
    if (ti < inceput || ts > sfarsit) return eroare(locale === "en" ? `The shift “${textCurat(tu.nume, 40) || "Voluntar"}” must fall within the activity's time slot.` : `Tura „${textCurat(tu.nume, 40) || "Voluntar"}” trebuie să fie în intervalul activității.`);
    const locuri = Math.floor(Number(tu.locuri));
    if (!Number.isFinite(locuri) || locuri < 1 || locuri > 500) return eroare(t("Numărul de locuri trebuie să fie între 1 și 500.", "The number of spots must be between 1 and 500."));
    turi.push({ id: tu.id && UUID_REGEX.test(tu.id) ? tu.id : undefined, nume: textCurat(tu.nume, MAX.nume) || "Voluntar", inceputLa: ti, seTerminaLa: ts, locuri });
  }

  const valori = {
    titlu,
    descriere: textCurat(i.descriere, MAX.descriere) || null,
    locatie,
    localitate: textCurat(i.localitate, 80) || null,
    inceputLa: inceput,
    seTerminaLa: sfarsit,
    coordonatorNume: textCurat(i.coordonatorNume, MAX.nume) || null,
    coordonatorTelefon: textCurat(i.coordonatorTelefon, 30) || null,
    aprobare: i.aprobare === "manuala" ? "manuala" : "automata",
    cerinte: textCurat(i.cerinte, MAX.instructiuni) || null,
    instructiuni: textCurat(i.instructiuni, MAX.instructiuni) || null,
    contactZi: textCurat(i.contactZi, 200) || null,
    cuMinori: !!i.cuMinori,
    rezultatEticheta: textCurat(i.rezultatEticheta, 60) || null,
    stare: i.stare === "ciorna" ? "ciorna" : "publicata",
    updatedAt: new Date(),
  };

  let id: string;
  if (i.id) {
    if (!UUID_REGEX.test(i.id)) return eroare(t("Activitate invalidă.", "Invalid activity."));
    const r = await ctx.db.update(volunteerActivities).set(valori).where(and(eq(volunteerActivities.id, i.id), eq(volunteerActivities.orgId, ctx.orgId))).returning({ id: volunteerActivities.id });
    if (!r[0]) return eroare(t("Activitatea nu mai există.", "The activity no longer exists."));
    id = r[0].id;
    // Turele care nu mai apar se șterg doar dacă nu au înscrieri.
    const existente = await ctx.db.select({ id: volunteerShifts.id, nume: volunteerShifts.nume }).from(volunteerShifts).where(and(eq(volunteerShifts.activityId, id), eq(volunteerShifts.orgId, ctx.orgId)));
    const pastrate = new Set(turi.map((t) => t.id).filter(Boolean));
    const deSters = existente.filter((e) => !pastrate.has(e.id));
    if (deSters.length > 0) {
      const [cuInscrieri] = await ctx.db
        .select({ n: sql<number>`count(*)::int` })
        .from(volunteerSignups)
        .where(and(eq(volunteerSignups.orgId, ctx.orgId), inArray(volunteerSignups.shiftId, deSters.map((d) => d.id))));
      if ((cuInscrieri?.n ?? 0) > 0) return eroare(t("O tură cu înscrieri nu poate fi ștearsă. Anulează întâi înscrierile sau lasă tura.", "A shift with sign-ups cannot be deleted. Cancel the sign-ups first or keep the shift."));
      await ctx.db.delete(volunteerShifts).where(and(eq(volunteerShifts.orgId, ctx.orgId), inArray(volunteerShifts.id, deSters.map((d) => d.id))));
    }
  } else {
    const [nou] = await ctx.db.insert(volunteerActivities).values({ ...valori, orgId: ctx.orgId, createdBy: ctx.userId }).returning({ id: volunteerActivities.id });
    id = nou.id;
    await audit(ctx, "voluntari_activitate_creata", id, { titlu });
  }

  for (const t of turi) {
    const campuri = { nume: t.nume, inceputLa: t.inceputLa, seTerminaLa: t.seTerminaLa, locuri: t.locuri };
    if (t.id) {
      const r = await ctx.db.update(volunteerShifts).set(campuri).where(and(eq(volunteerShifts.id, t.id), eq(volunteerShifts.activityId, id), eq(volunteerShifts.orgId, ctx.orgId))).returning({ id: volunteerShifts.id });
      if (r[0]) continue;
    }
    await ctx.db.insert(volunteerShifts).values({ ...campuri, orgId: ctx.orgId, activityId: id });
  }
  return { ok: true, id };
});

export const seteazaStareActivitateAction = withOrgSession(async (ctx, id: string, stare: "publicata" | "anulata" | "incheiata"): Promise<Rez> => {
  const t = await getTr();
  if (!UUID_REGEX.test(String(id)) || !["publicata", "anulata", "incheiata"].includes(stare)) return eroare(t("Cerere invalidă.", "Invalid request."));
  const r = await ctx.db.update(volunteerActivities).set({ stare, updatedAt: new Date() }).where(and(eq(volunteerActivities.id, id), eq(volunteerActivities.orgId, ctx.orgId))).returning({ id: volunteerActivities.id });
  if (!r[0]) return eroare(t("Activitatea nu mai există.", "The activity no longer exists."));
  await audit(ctx, `voluntari_activitate_${stare}`, id);
  return { ok: true };
});

export const stergeActivitateAction = withOrgSession(async (ctx, id: string): Promise<Rez> => {
  const t = await getTr();
  if (!UUID_REGEX.test(String(id))) return eroare(t("Cerere invalidă.", "Invalid request."));
  const r = await ctx.db.delete(volunteerActivities).where(and(eq(volunteerActivities.id, id), eq(volunteerActivities.orgId, ctx.orgId))).returning({ id: volunteerActivities.id });
  if (!r[0]) return eroare(t("Activitatea nu mai există.", "The activity no longer exists."));
  await audit(ctx, "voluntari_activitate_stearsa", id);
  return { ok: true };
});

// ===== Înscrieri, prezență, ore =====
async function inscriere(ctx: OrgContext, id: string) {
  if (!UUID_REGEX.test(String(id))) return null;
  const [r] = await ctx.db
    .select({ id: volunteerSignups.id, status: volunteerSignups.status, shiftId: volunteerSignups.shiftId, activityId: volunteerSignups.activityId, oreCalculate: volunteerSignups.oreCalculate, inceputLa: volunteerShifts.inceputLa, seTerminaLa: volunteerShifts.seTerminaLa })
    .from(volunteerSignups)
    .innerJoin(volunteerShifts, eq(volunteerShifts.id, volunteerSignups.shiftId))
    .where(and(eq(volunteerSignups.id, id), eq(volunteerSignups.orgId, ctx.orgId)))
    .limit(1);
  return r ?? null;
}

// Aprobarea sau respingerea unei cereri „în așteptare”.
export const decideInscriereAction = withOrgSession(async (ctx, id: string, aproba: boolean): Promise<Rez> => {
  const t = await getTr();
  const i = await inscriere(ctx, id);
  if (!i) return eroare(t("Înscrierea nu mai există.", "The sign-up no longer exists."));
  if (i.status !== "in_asteptare") return eroare(t("Această cerere a primit deja un răspuns.", "This request has already received a reply."));
  if (!aproba) {
    await ctx.db.update(volunteerSignups).set({ status: "anulata", updatedAt: new Date() }).where(and(eq(volunteerSignups.id, id), eq(volunteerSignups.orgId, ctx.orgId)));
    await promoveazaDinRezerva(ctx.db as unknown as Tx, ctx.orgId, i.shiftId);
    return { ok: true };
  }
  const tura = await blocheazaTura(ctx.db as unknown as Tx, ctx.orgId, i.shiftId);
  if (!tura) return eroare(t("Tura nu mai există.", "The shift no longer exists."));
  // Cererea însăși ocupă deja un loc (in_asteptare), deci aprobarea nu schimbă numărul de locuri ocupate.
  const ocupate = await locuriOcupate(ctx.db as unknown as Tx, ctx.orgId, i.shiftId);
  if (ocupate > tura.locuri) return eroare(t("Tura are mai multe cereri decât locuri. Mărește numărul de locuri sau respinge o cerere.", "The shift has more requests than spots. Increase the number of spots or decline a request."));
  await ctx.db.update(volunteerSignups).set({ status: "confirmata", updatedAt: new Date() }).where(and(eq(volunteerSignups.id, id), eq(volunteerSignups.orgId, ctx.orgId)));
  return { ok: true };
});

export const marcheazaPrezentaAction = withOrgSession(async (ctx, id: string, status: "prezent" | "absent" | "confirmata"): Promise<Rez> => {
  const t = await getTr();
  if (!["prezent", "absent", "confirmata"].includes(status)) return eroare(t("Cerere invalidă.", "Invalid request."));
  const i = await inscriere(ctx, id);
  if (!i) return eroare(t("Înscrierea nu mai există.", "The sign-up no longer exists."));
  if (["anulata", "rezerva", "in_asteptare"].includes(i.status)) return eroare(t("Doar înscrierile confirmate pot fi marcate prezente sau absente.", "Only confirmed sign-ups can be marked present or absent."));
  const ore = status === "prezent" ? (i.oreCalculate != null ? Number(i.oreCalculate) : calculeazaOre(i.inceputLa, i.seTerminaLa)) : null;
  await ctx.db
    .update(volunteerSignups)
    .set({ status, oreCalculate: ore != null ? String(ore) : null, oreValidate: null, validatLa: null, validatDe: null, updatedAt: new Date() })
    .where(and(eq(volunteerSignups.id, id), eq(volunteerSignups.orgId, ctx.orgId)));
  return { ok: true };
});

export const seteazaOreAction = withOrgSession(async (ctx, id: string, ore: number): Promise<Rez> => {
  const t = await getTr();
  const valoare = Math.round(Number(ore) * 4) / 4;
  if (!Number.isFinite(valoare) || valoare < 0 || valoare > 24) return eroare(t("Orele trebuie să fie între 0 și 24.", "Hours must be between 0 and 24."));
  const i = await inscriere(ctx, id);
  if (!i) return eroare(t("Înscrierea nu mai există.", "The sign-up no longer exists."));
  if (i.status !== "prezent") return eroare(t("Orele se setează doar pentru cei marcați prezenți.", "Hours can only be set for those marked present."));
  await ctx.db
    .update(volunteerSignups)
    .set({ oreCalculate: String(valoare), oreValidate: null, validatLa: null, validatDe: null, updatedAt: new Date() })
    .where(and(eq(volunteerSignups.id, id), eq(volunteerSignups.orgId, ctx.orgId)));
  return { ok: true };
});

// Validarea orelor și închiderea activității: doar orele validate intră în adeverințe și rapoarte.
export const valideazaOreActivitateAction = withOrgSession(
  async (ctx, activityId: string, rezultatValoare: number | null): Promise<Rez<{ validate: number }>> => {
    const t = await getTr();
    if (!UUID_REGEX.test(String(activityId))) return eroare(t("Cerere invalidă.", "Invalid request."));
    const [a] = await ctx.db.select({ id: volunteerActivities.id }).from(volunteerActivities).where(and(eq(volunteerActivities.id, activityId), eq(volunteerActivities.orgId, ctx.orgId))).limit(1);
    if (!a) return eroare(t("Activitatea nu mai există.", "The activity no longer exists."));
    const prezenti = await ctx.db
      .select({ id: volunteerSignups.id, oreCalculate: volunteerSignups.oreCalculate, inceputLa: volunteerShifts.inceputLa, seTerminaLa: volunteerShifts.seTerminaLa })
      .from(volunteerSignups)
      .innerJoin(volunteerShifts, eq(volunteerShifts.id, volunteerSignups.shiftId))
      .where(and(eq(volunteerSignups.orgId, ctx.orgId), eq(volunteerSignups.activityId, activityId), eq(volunteerSignups.status, "prezent")));
    const acum = new Date();
    for (const p of prezenti) {
      const ore = p.oreCalculate != null ? Number(p.oreCalculate) : calculeazaOre(p.inceputLa, p.seTerminaLa);
      await ctx.db
        .update(volunteerSignups)
        .set({ oreCalculate: String(ore), oreValidate: String(ore), validatLa: acum, validatDe: ctx.userId, updatedAt: acum })
        .where(and(eq(volunteerSignups.id, p.id), eq(volunteerSignups.orgId, ctx.orgId)));
    }
    const rezultat = rezultatValoare == null || String(rezultatValoare) === "" ? null : Number(rezultatValoare);
    await ctx.db
      .update(volunteerActivities)
      .set({ stare: "incheiata", rezultatValoare: rezultat != null && Number.isFinite(rezultat) ? String(rezultat) : null, updatedAt: acum })
      .where(and(eq(volunteerActivities.id, activityId), eq(volunteerActivities.orgId, ctx.orgId)));
    await audit(ctx, "voluntari_ore_validate", activityId, { prezenti: prezenti.length });
    return { ok: true, validate: prezenti.length };
  },
);

// ===== Raportări =====
export const rezolvaRaportareAction = withOrgSession(async (ctx, id: string): Promise<Rez> => {
  const t = await getTr();
  if (!UUID_REGEX.test(String(id))) return eroare(t("Cerere invalidă.", "Invalid request."));
  const r = await ctx.db.update(volunteerReports).set({ stare: "rezolvata" }).where(and(eq(volunteerReports.id, id), eq(volunteerReports.orgId, ctx.orgId))).returning({ id: volunteerReports.id });
  return r[0] ? { ok: true } : eroare(t("Raportarea nu mai există.", "The report no longer exists."));
});

// ===== Linkul coordonatorului =====
// Un cod secret pe activitate (24 de caractere). Un cod nou îl înlocuiește pe cel vechi; valabil până la 3 zile după încheiere.
export const genereazaLinkCoordonatorAction = withOrgSession(async (ctx, activityId: string): Promise<Rez<{ link: string }>> => {
  const t = await getTr();
  if (!UUID_REGEX.test(String(activityId))) return eroare(t("Cerere invalidă.", "Invalid request."));
  const cod = genereazaCodScurt(24);
  const r = await ctx.db
    .update(volunteerActivities)
    .set({ coordinatorToken: cod, updatedAt: new Date() })
    .where(and(eq(volunteerActivities.id, activityId), eq(volunteerActivities.orgId, ctx.orgId)))
    .returning({ id: volunteerActivities.id });
  if (!r[0]) return eroare(t("Activitatea nu mai există.", "The activity no longer exists."));
  await audit(ctx, "voluntari_link_coordonator_generat", activityId);
  return { ok: true, link: `${URL_BAZA()}/coordonator/${cod}` };
});

export const opresteLinkCoordonatorAction = withOrgSession(async (ctx, activityId: string): Promise<Rez> => {
  const t = await getTr();
  if (!UUID_REGEX.test(String(activityId))) return eroare(t("Cerere invalidă.", "Invalid request."));
  const r = await ctx.db
    .update(volunteerActivities)
    .set({ coordinatorToken: null, updatedAt: new Date() })
    .where(and(eq(volunteerActivities.id, activityId), eq(volunteerActivities.orgId, ctx.orgId)))
    .returning({ id: volunteerActivities.id });
  if (!r[0]) return eroare(t("Activitatea nu mai există.", "The activity no longer exists."));
  await audit(ctx, "voluntari_link_coordonator_oprit", activityId);
  return { ok: true };
});

// ===== Invitații la activități =====
// Doar voluntarilor care au bifat explicit că vor invitații, au un email, au mai făcut ceva cu organizația (au fost prezenți, au
// terminat o sarcină sau au distribuit) și nu au primit o invitație în ultimele 7 zile. Cei deja înscriși la activitate nu apar.
export const candidatiInvitatiiAction = withOrgSession(
  async (ctx, activityId: string): Promise<Rez<{ candidati: CandidatInvitatie[]; emailActiv: boolean; linkActiv: boolean }>> => {
    const t = await getTr();
    if (!UUID_REGEX.test(String(activityId))) return eroare(t("Cerere invalidă.", "Invalid request."));
    const [link] = await ctx.db.select({ activ: volunteerPanelLinks.activ }).from(volunteerPanelLinks).where(eq(volunteerPanelLinks.orgId, ctx.orgId)).limit(1);
    return { ok: true, candidati: await candidatiPentru(ctx, activityId), emailActiv: emailConfigurat(), linkActiv: !!link?.activ };
  },
);

export const trimiteInvitatiiAction = withOrgSession(async (ctx, activityId: string, ids: string[]): Promise<Rez<{ trimise: number; esuate: number }>> => {
  const t = await getTr();
  if (!UUID_REGEX.test(String(activityId))) return eroare(t("Cerere invalidă.", "Invalid request."));
  if (!emailConfigurat()) return eroare(t("Emailul nu e configurat pe acest server, deci nu putem trimite invitații.", "Email is not configured on this server, so we cannot send invitations."));
  const alesi = new Set((Array.isArray(ids) ? ids : []).filter((x) => UUID_REGEX.test(String(x))).slice(0, MAX_INVITATII));
  if (alesi.size === 0) return eroare(t("Alege cel puțin un voluntar.", "Choose at least one volunteer."));
  const [a] = await ctx.db
    .select({ titlu: volunteerActivities.titlu, locatie: volunteerActivities.locatie, inceputLa: volunteerActivities.inceputLa, seTerminaLa: volunteerActivities.seTerminaLa, stare: volunteerActivities.stare })
    .from(volunteerActivities)
    .where(and(eq(volunteerActivities.id, activityId), eq(volunteerActivities.orgId, ctx.orgId)))
    .limit(1);
  if (!a) return eroare(t("Activitatea nu mai există.", "The activity no longer exists."));
  if (a.stare !== "publicata" || a.seTerminaLa.getTime() < Date.now()) return eroare(t("Invitațiile se trimit doar pentru activități publicate care nu s-au încheiat.", "Invitations are sent only for published activities that have not ended."));
  const [link] = await ctx.db.select({ cod: volunteerPanelLinks.cod, activ: volunteerPanelLinks.activ }).from(volunteerPanelLinks).where(eq(volunteerPanelLinks.orgId, ctx.orgId)).limit(1);
  if (!link?.activ) return eroare(t("Pornește linkul voluntarilor înainte să trimiți invitații.", "Turn on the volunteer link before sending invitations."));

  // Se reia verificarea de eligibilitate pe server: nu ne bazăm pe lista primită de la browser.
  const eligibili = new Set((await candidatiPentru(ctx, activityId)).map((c) => c.id));
  const tinte = [...alesi].filter((id) => eligibili.has(id));
  if (tinte.length === 0) return eroare(t("Nimeni dintre cei aleși nu mai poate primi invitația (au primit una recent sau s-au înscris deja).", "None of those chosen can receive the invitation any more (they received one recently or have already signed up)."));
  const adrese = await ctx.db
    .select({ id: volunteerVisitors.id, prenume: volunteerVisitors.prenume, email: volunteerVisitors.email })
    .from(volunteerVisitors)
    .where(and(eq(volunteerVisitors.orgId, ctx.orgId), inArray(volunteerVisitors.id, tinte)));

  let trimise = 0;
  let esuate = 0;
  const pagina = `${URL_BAZA()}/voluntar/${link.cod}`;
  for (const v of adrese) {
    if (!v.email) continue;
    const mail = emailInvitatie({ org: ctx.orgName, prenume: v.prenume, titlu: a.titlu, locatie: a.locatie, inceputLa: a.inceputLa, link: pagina });
    try {
      await trimiteEmail({ to: v.email, subiect: mail.subiect, html: mail.html });
      await ctx.db.update(volunteerVisitors).set({ ultimaInvitatieLa: new Date() }).where(and(eq(volunteerVisitors.id, v.id), eq(volunteerVisitors.orgId, ctx.orgId)));
      trimise += 1;
    } catch {
      esuate += 1;
    }
  }
  await audit(ctx, "voluntari_invitatii_trimise", activityId, { trimise, esuate });
  return { ok: true, trimise, esuate };
});
