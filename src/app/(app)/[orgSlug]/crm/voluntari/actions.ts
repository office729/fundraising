"use server";

import { and, eq, inArray, sql } from "drizzle-orm";

import { withOrgSession, type OrgContext } from "@/lib/auth/guard";
import type { Tx } from "@/lib/db";
import { fundraisingAuditLog, fundraisingPages, volunteerActivities, volunteerPanelLinks, volunteerReports, volunteerShifts, volunteerSignups, volunteerTasks, volunteerVisitors } from "@/lib/db/schema";
import { emailConfigurat, trimiteEmail } from "@/lib/email";
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
  const titlu = textCurat(i.titlu, MAX.titlu);
  const descriere = textCurat(i.descriere, MAX.descriere);
  if (titlu.length < 3) return eroare("Scrie un titlu (cel puțin 3 caractere).");
  if (descriere.length < 5) return eroare("Spune pe scurt ce trebuie făcut.");
  if (!esteTipSarcina(i.tip)) return eroare("Alege tipul sarcinii.");
  const termen = String(i.termen ?? "");
  if (!DATA.test(termen)) return eroare("Alege un termen.");
  const inceput = String(i.inceputLa ?? "");
  if (inceput && !DATA.test(inceput)) return eroare("Data de început nu e validă.");
  if (inceput && inceput > termen) return eroare("Data de început trebuie să fie înainte de termen.");

  let campanieId: string | null = null;
  if (i.campanieId) {
    if (!UUID_REGEX.test(i.campanieId)) return eroare("Campania aleasă nu e validă.");
    const [c] = await ctx.db.select({ id: fundraisingPages.id }).from(fundraisingPages).where(and(eq(fundraisingPages.id, i.campanieId), eq(fundraisingPages.orgId, ctx.orgId))).limit(1);
    if (!c) return eroare("Campania aleasă nu mai există.");
    campanieId = c.id;
  }
  const linkBrut = String(i.linkBaza ?? "").trim();
  const linkBaza = linkBrut ? normalizeazaLink(linkBrut) : null;
  if (linkBrut && !linkBaza) return eroare("Linkul trebuie să înceapă cu https://.");
  const imgBrut = String(i.imagineUrl ?? "").trim();
  const imagineUrl = imgBrut ? normalizeazaLink(imgBrut) : null;
  if (imgBrut && !imagineUrl) return eroare("Linkul imaginii trebuie să înceapă cu https://.");

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
    if (!UUID_REGEX.test(i.id)) return eroare("Sarcină invalidă.");
    const r = await ctx.db.update(volunteerTasks).set(valori).where(and(eq(volunteerTasks.id, i.id), eq(volunteerTasks.orgId, ctx.orgId))).returning({ id: volunteerTasks.id });
    if (!r[0]) return eroare("Sarcina nu mai există.");
    return { ok: true, id: r[0].id };
  }
  const [nou] = await ctx.db.insert(volunteerTasks).values({ ...valori, orgId: ctx.orgId, createdBy: ctx.userId }).returning({ id: volunteerTasks.id });
  await audit(ctx, "voluntari_sarcina_creata", nou.id, { titlu });
  return { ok: true, id: nou.id };
});

export const seteazaStareSarcinaAction = withOrgSession(async (ctx, id: string, stare: "publicata" | "inchisa"): Promise<Rez> => {
  if (!UUID_REGEX.test(String(id)) || !["publicata", "inchisa"].includes(stare)) return eroare("Cerere invalidă.");
  const r = await ctx.db.update(volunteerTasks).set({ stare, updatedAt: new Date() }).where(and(eq(volunteerTasks.id, id), eq(volunteerTasks.orgId, ctx.orgId))).returning({ id: volunteerTasks.id });
  return r[0] ? { ok: true } : eroare("Sarcina nu mai există.");
});

export const stergeSarcinaAction = withOrgSession(async (ctx, id: string): Promise<Rez> => {
  if (!UUID_REGEX.test(String(id))) return eroare("Cerere invalidă.");
  const r = await ctx.db.delete(volunteerTasks).where(and(eq(volunteerTasks.id, id), eq(volunteerTasks.orgId, ctx.orgId))).returning({ id: volunteerTasks.id });
  if (!r[0]) return eroare("Sarcina nu mai există.");
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
  const titlu = textCurat(i.titlu, MAX.titlu);
  const locatie = textCurat(i.locatie, MAX.locatie);
  if (titlu.length < 3) return eroare("Scrie un titlu (cel puțin 3 caractere).");
  if (locatie.length < 3) return eroare("Scrie locul unde are loc activitatea.");
  const inceput = dinOraRo(i.inceputLa);
  const sfarsit = dinOraRo(i.seTerminaLa);
  if (!inceput || !sfarsit) return eroare("Alege data și ora de început și de sfârșit.");
  if (sfarsit <= inceput) return eroare("Sfârșitul trebuie să fie după început.");
  if (!i.id && sfarsit.getTime() < Date.now()) return eroare("Activitatea trebuie să fie în viitor.");

  const turiBrute = Array.isArray(i.ture) && i.ture.length > 0 ? i.ture : [{ nume: "Voluntar", inceputLa: i.inceputLa, seTerminaLa: i.seTerminaLa, locuri: 10 }];
  if (turiBrute.length > 20) return eroare("Cel mult 20 de ture sau roluri pe activitate.");
  const turi: { id?: string; nume: string; inceputLa: Date; seTerminaLa: Date; locuri: number }[] = [];
  for (const t of turiBrute) {
    const ti = dinOraRo(t.inceputLa) ?? inceput;
    const ts = dinOraRo(t.seTerminaLa) ?? sfarsit;
    if (ts <= ti) return eroare(`La „${textCurat(t.nume, 40) || "Voluntar"}”, sfârșitul trebuie să fie după început.`);
    if (ti < inceput || ts > sfarsit) return eroare(`Tura „${textCurat(t.nume, 40) || "Voluntar"}” trebuie să fie în intervalul activității.`);
    const locuri = Math.floor(Number(t.locuri));
    if (!Number.isFinite(locuri) || locuri < 1 || locuri > 500) return eroare("Numărul de locuri trebuie să fie între 1 și 500.");
    turi.push({ id: t.id && UUID_REGEX.test(t.id) ? t.id : undefined, nume: textCurat(t.nume, MAX.nume) || "Voluntar", inceputLa: ti, seTerminaLa: ts, locuri });
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
    if (!UUID_REGEX.test(i.id)) return eroare("Activitate invalidă.");
    const r = await ctx.db.update(volunteerActivities).set(valori).where(and(eq(volunteerActivities.id, i.id), eq(volunteerActivities.orgId, ctx.orgId))).returning({ id: volunteerActivities.id });
    if (!r[0]) return eroare("Activitatea nu mai există.");
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
      if ((cuInscrieri?.n ?? 0) > 0) return eroare("O tură cu înscrieri nu poate fi ștearsă. Anulează întâi înscrierile sau lasă tura.");
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
  if (!UUID_REGEX.test(String(id)) || !["publicata", "anulata", "incheiata"].includes(stare)) return eroare("Cerere invalidă.");
  const r = await ctx.db.update(volunteerActivities).set({ stare, updatedAt: new Date() }).where(and(eq(volunteerActivities.id, id), eq(volunteerActivities.orgId, ctx.orgId))).returning({ id: volunteerActivities.id });
  if (!r[0]) return eroare("Activitatea nu mai există.");
  await audit(ctx, `voluntari_activitate_${stare}`, id);
  return { ok: true };
});

export const stergeActivitateAction = withOrgSession(async (ctx, id: string): Promise<Rez> => {
  if (!UUID_REGEX.test(String(id))) return eroare("Cerere invalidă.");
  const r = await ctx.db.delete(volunteerActivities).where(and(eq(volunteerActivities.id, id), eq(volunteerActivities.orgId, ctx.orgId))).returning({ id: volunteerActivities.id });
  if (!r[0]) return eroare("Activitatea nu mai există.");
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
  const i = await inscriere(ctx, id);
  if (!i) return eroare("Înscrierea nu mai există.");
  if (i.status !== "in_asteptare") return eroare("Această cerere a primit deja un răspuns.");
  if (!aproba) {
    await ctx.db.update(volunteerSignups).set({ status: "anulata", updatedAt: new Date() }).where(and(eq(volunteerSignups.id, id), eq(volunteerSignups.orgId, ctx.orgId)));
    await promoveazaDinRezerva(ctx.db as unknown as Tx, ctx.orgId, i.shiftId);
    return { ok: true };
  }
  const tura = await blocheazaTura(ctx.db as unknown as Tx, ctx.orgId, i.shiftId);
  if (!tura) return eroare("Tura nu mai există.");
  // Cererea însăși ocupă deja un loc (in_asteptare), deci aprobarea nu schimbă numărul de locuri ocupate.
  const ocupate = await locuriOcupate(ctx.db as unknown as Tx, ctx.orgId, i.shiftId);
  if (ocupate > tura.locuri) return eroare("Tura are mai multe cereri decât locuri. Mărește numărul de locuri sau respinge o cerere.");
  await ctx.db.update(volunteerSignups).set({ status: "confirmata", updatedAt: new Date() }).where(and(eq(volunteerSignups.id, id), eq(volunteerSignups.orgId, ctx.orgId)));
  return { ok: true };
});

export const marcheazaPrezentaAction = withOrgSession(async (ctx, id: string, status: "prezent" | "absent" | "confirmata"): Promise<Rez> => {
  if (!["prezent", "absent", "confirmata"].includes(status)) return eroare("Cerere invalidă.");
  const i = await inscriere(ctx, id);
  if (!i) return eroare("Înscrierea nu mai există.");
  if (["anulata", "rezerva", "in_asteptare"].includes(i.status)) return eroare("Doar înscrierile confirmate pot fi marcate prezente sau absente.");
  const ore = status === "prezent" ? (i.oreCalculate != null ? Number(i.oreCalculate) : calculeazaOre(i.inceputLa, i.seTerminaLa)) : null;
  await ctx.db
    .update(volunteerSignups)
    .set({ status, oreCalculate: ore != null ? String(ore) : null, oreValidate: null, validatLa: null, validatDe: null, updatedAt: new Date() })
    .where(and(eq(volunteerSignups.id, id), eq(volunteerSignups.orgId, ctx.orgId)));
  return { ok: true };
});

export const seteazaOreAction = withOrgSession(async (ctx, id: string, ore: number): Promise<Rez> => {
  const valoare = Math.round(Number(ore) * 4) / 4;
  if (!Number.isFinite(valoare) || valoare < 0 || valoare > 24) return eroare("Orele trebuie să fie între 0 și 24.");
  const i = await inscriere(ctx, id);
  if (!i) return eroare("Înscrierea nu mai există.");
  if (i.status !== "prezent") return eroare("Orele se setează doar pentru cei marcați prezenți.");
  await ctx.db
    .update(volunteerSignups)
    .set({ oreCalculate: String(valoare), oreValidate: null, validatLa: null, validatDe: null, updatedAt: new Date() })
    .where(and(eq(volunteerSignups.id, id), eq(volunteerSignups.orgId, ctx.orgId)));
  return { ok: true };
});

// Validarea orelor și închiderea activității: doar orele validate intră în adeverințe și rapoarte.
export const valideazaOreActivitateAction = withOrgSession(
  async (ctx, activityId: string, rezultatValoare: number | null): Promise<Rez<{ validate: number }>> => {
    if (!UUID_REGEX.test(String(activityId))) return eroare("Cerere invalidă.");
    const [a] = await ctx.db.select({ id: volunteerActivities.id }).from(volunteerActivities).where(and(eq(volunteerActivities.id, activityId), eq(volunteerActivities.orgId, ctx.orgId))).limit(1);
    if (!a) return eroare("Activitatea nu mai există.");
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
  if (!UUID_REGEX.test(String(id))) return eroare("Cerere invalidă.");
  const r = await ctx.db.update(volunteerReports).set({ stare: "rezolvata" }).where(and(eq(volunteerReports.id, id), eq(volunteerReports.orgId, ctx.orgId))).returning({ id: volunteerReports.id });
  return r[0] ? { ok: true } : eroare("Raportarea nu mai există.");
});

// ===== Linkul coordonatorului =====
// Un cod secret pe activitate (24 de caractere). Un cod nou îl înlocuiește pe cel vechi; valabil până la 3 zile după încheiere.
export const genereazaLinkCoordonatorAction = withOrgSession(async (ctx, activityId: string): Promise<Rez<{ link: string }>> => {
  if (!UUID_REGEX.test(String(activityId))) return eroare("Cerere invalidă.");
  const cod = genereazaCodScurt(24);
  const r = await ctx.db
    .update(volunteerActivities)
    .set({ coordinatorToken: cod, updatedAt: new Date() })
    .where(and(eq(volunteerActivities.id, activityId), eq(volunteerActivities.orgId, ctx.orgId)))
    .returning({ id: volunteerActivities.id });
  if (!r[0]) return eroare("Activitatea nu mai există.");
  await audit(ctx, "voluntari_link_coordonator_generat", activityId);
  return { ok: true, link: `${URL_BAZA()}/coordonator/${cod}` };
});

export const opresteLinkCoordonatorAction = withOrgSession(async (ctx, activityId: string): Promise<Rez> => {
  if (!UUID_REGEX.test(String(activityId))) return eroare("Cerere invalidă.");
  const r = await ctx.db
    .update(volunteerActivities)
    .set({ coordinatorToken: null, updatedAt: new Date() })
    .where(and(eq(volunteerActivities.id, activityId), eq(volunteerActivities.orgId, ctx.orgId)))
    .returning({ id: volunteerActivities.id });
  if (!r[0]) return eroare("Activitatea nu mai există.");
  await audit(ctx, "voluntari_link_coordonator_oprit", activityId);
  return { ok: true };
});

// ===== Invitații la activități =====
// Doar voluntarilor care au bifat explicit că vor invitații, au un email, au mai făcut ceva cu organizația (au fost prezenți, au
// terminat o sarcină sau au distribuit) și nu au primit o invitație în ultimele 7 zile. Cei deja înscriși la activitate nu apar.
export const candidatiInvitatiiAction = withOrgSession(
  async (ctx, activityId: string): Promise<Rez<{ candidati: CandidatInvitatie[]; emailActiv: boolean; linkActiv: boolean }>> => {
    if (!UUID_REGEX.test(String(activityId))) return eroare("Cerere invalidă.");
    const [link] = await ctx.db.select({ activ: volunteerPanelLinks.activ }).from(volunteerPanelLinks).where(eq(volunteerPanelLinks.orgId, ctx.orgId)).limit(1);
    return { ok: true, candidati: await candidatiPentru(ctx, activityId), emailActiv: emailConfigurat(), linkActiv: !!link?.activ };
  },
);

export const trimiteInvitatiiAction = withOrgSession(async (ctx, activityId: string, ids: string[]): Promise<Rez<{ trimise: number; esuate: number }>> => {
  if (!UUID_REGEX.test(String(activityId))) return eroare("Cerere invalidă.");
  if (!emailConfigurat()) return eroare("Emailul nu e configurat pe acest server, deci nu putem trimite invitații.");
  const alesi = new Set((Array.isArray(ids) ? ids : []).filter((x) => UUID_REGEX.test(String(x))).slice(0, MAX_INVITATII));
  if (alesi.size === 0) return eroare("Alege cel puțin un voluntar.");
  const [a] = await ctx.db
    .select({ titlu: volunteerActivities.titlu, locatie: volunteerActivities.locatie, inceputLa: volunteerActivities.inceputLa, seTerminaLa: volunteerActivities.seTerminaLa, stare: volunteerActivities.stare })
    .from(volunteerActivities)
    .where(and(eq(volunteerActivities.id, activityId), eq(volunteerActivities.orgId, ctx.orgId)))
    .limit(1);
  if (!a) return eroare("Activitatea nu mai există.");
  if (a.stare !== "publicata" || a.seTerminaLa.getTime() < Date.now()) return eroare("Invitațiile se trimit doar pentru activități publicate care nu s-au încheiat.");
  const [link] = await ctx.db.select({ cod: volunteerPanelLinks.cod, activ: volunteerPanelLinks.activ }).from(volunteerPanelLinks).where(eq(volunteerPanelLinks.orgId, ctx.orgId)).limit(1);
  if (!link?.activ) return eroare("Pornește linkul voluntarilor înainte să trimiți invitații.");

  // Se reia verificarea de eligibilitate pe server: nu ne bazăm pe lista primită de la browser.
  const eligibili = new Set((await candidatiPentru(ctx, activityId)).map((c) => c.id));
  const tinte = [...alesi].filter((id) => eligibili.has(id));
  if (tinte.length === 0) return eroare("Nimeni dintre cei aleși nu mai poate primi invitația (au primit una recent sau s-au înscris deja).");
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
