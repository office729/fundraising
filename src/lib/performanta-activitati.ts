import { and, asc, eq, gte, inArray, isNull, lt, lte, ne, or, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { activitati, angajati, angajatiAbsente, appUsers, blocaje, departments, kpiAuditLog, obiective, obiectiveColaboratori, rezultateCheie, roluri } from "@/lib/db/schema";
import {
  STATUSURI_DESCHISE,
  dependentaCiclica,
  esteIntarziata,
  urmatoareaOcurenta,
  valideazaAbsenta,
  valideazaActivitate,
  valideazaBlocaj,
  valideazaTranzitie,
  type AbsentaInput,
  type ActivitateInput,
  type BlocajInput,
  type Prioritate,
  type StatusActivitate,
} from "@/lib/performanta-activitati-reguli";
import type { AbsentaDto, ActivitateDto, BlocajDto, FiltruActivitati, MembruEchipa } from "@/lib/performanta-activitati-tipuri";
import { poateActualizaRezultat, poateAproba, poateEditaActivitate, poateEditaObiectiv, vedeActivitate, vedeObiectiv, type Eu, type ObiectivAcces } from "@/lib/performanta-acces";
import { incarcaObiective, incarcaStructura } from "@/lib/performanta-date";
import { aziRo, capacitateSaptamana, incarcareSaptamana, luniSaptamanii, nivelIncarcare } from "@/lib/performanta-masurare";
import type { ObiectivDto } from "@/lib/performanta-tipuri";

// Activități, blocaje, absențe, echipă și Spațiul meu. Logica e aici (fără sesiune), ca să poată fi testată; învelișurile cu sesiune
// sunt în crm/performanta/*-actions.ts. Drepturile se verifică la fiecare operație (lib/performanta-acces.ts).

type Rez<T extends object = object> = ({ ok: true } & T) | { ok: false; eroare: string };
const eroare = (e: string) => ({ ok: false as const, eroare: e });
const adauga = (iso: string, zile: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + zile);
  return d.toISOString().slice(0, 10);
};

const audit = (ctx: OrgContext, actiune: string, entitate: string, entitateId: string, detalii: Record<string, unknown>) =>
  ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune, entitate, entitateId, detalii });

type AccesObiectiv = ObiectivAcces & { id: string; titlu: string; status: string };

async function accesObiective(ctx: OrgContext, ids: string[]): Promise<Map<string, AccesObiectiv>> {
  const rez = new Map<string, AccesObiectiv>();
  const unice = [...new Set(ids)];
  if (unice.length === 0) return rez;
  const [rows, colab] = await Promise.all([
    ctx.db.select().from(obiective).where(and(eq(obiective.orgId, ctx.orgId), inArray(obiective.id, unice))),
    ctx.db.select({ o: obiectiveColaboratori.obiectivId, a: obiectiveColaboratori.angajatId }).from(obiectiveColaboratori).where(inArray(obiectiveColaboratori.obiectivId, unice)),
  ]);
  for (const o of rows) {
    rez.set(o.id, { id: o.id, titlu: o.titlu, status: o.status, vizibilitate: o.vizibilitate, responsabilId: o.responsabilId, departmentId: o.departmentId, creatDe: o.creatDe, colaboratori: colab.filter((c) => c.o === o.id).map((c) => c.a) });
  }
  return rez;
}

const vizibilaActivitate = (eu: Eu, a: { responsabilId: string | null; creatDe: string | null; obiectivId: string | null }, obiective: Map<string, AccesObiectiv>) => {
  const ob = a.obiectivId ? obiective.get(a.obiectivId) : undefined;
  return vedeActivitate(eu, { responsabilId: a.responsabilId, creatDe: a.creatDe }, ob ? vedeObiectiv(eu, ob) : false);
};

type RandAct = typeof activitati.$inferSelect;
type RandBlocaj = typeof blocaje.$inferSelect;

// ───────── Activități: citire ─────────

export async function incarcaActivitati(ctx: OrgContext, f: FiltruActivitati = {}): Promise<ActivitateDto[]> {
  const azi = aziRo();
  const struct = await incarcaStructura(ctx);
  const conditii = [eq(activitati.orgId, ctx.orgId)];
  if (f.status === "toate") {
    /* toate */
  } else if (f.status === "deschise") conditii.push(inArray(activitati.status, STATUSURI_DESCHISE));
  else if (f.status) conditii.push(eq(activitati.status, f.status));
  else conditii.push(ne(activitati.status, "anulat"));
  if (f.faraTermen) conditii.push(isNull(activitati.termen));
  else if (f.start && f.end) {
    const interval = and(gte(activitati.termen, f.start), lte(activitati.termen, f.end));
    conditii.push((f.restante ? or(interval, and(lt(activitati.termen, f.start), inArray(activitati.status, STATUSURI_DESCHISE))) : interval)!);
  }
  if (f.responsabilId) conditii.push(eq(activitati.responsabilId, f.responsabilId));
  if (f.obiectivId) conditii.push(eq(activitati.obiectivId, f.obiectivId));
  if (f.prioritate) conditii.push(eq(activitati.prioritate, f.prioritate));
  const q = (f.q ?? "").trim();
  if (q) conditii.push(sql`${activitati.titlu} ilike ${"%" + q.replace(/[%_\\]/g, "\\$&") + "%"}`);

  const randuri = await ctx.db.select().from(activitati).where(and(...conditii)).orderBy(asc(activitati.termen), asc(activitati.createdAt)).limit(1000);
  return construiesteDto(ctx, struct, randuri, azi);
}

async function construiesteDto(ctx: OrgContext, struct: Awaited<ReturnType<typeof incarcaStructura>>, randuri: RandAct[], azi: string): Promise<ActivitateDto[]> {
  if (randuri.length === 0) return [];
  const eu = struct.eu;
  const ob = await accesObiective(ctx, randuri.map((r) => r.obiectivId).filter((x): x is string => !!x));
  const vizibile = randuri.filter((r) => vizibilaActivitate(eu, r, ob));
  if (vizibile.length === 0) return [];
  const ids = vizibile.map((r) => r.id);
  const krIds = vizibile.map((r) => r.rezultatId).filter((x): x is string => !!x);
  const depIds = vizibile.map((r) => r.dependeDe).filter((x): x is string => !!x);
  const aprobatori = vizibile.map((r) => r.aprobataDe).filter((x): x is string => !!x);
  const [kr, deps, blo, apr] = await Promise.all([
    krIds.length ? ctx.db.select({ id: rezultateCheie.id, titlu: rezultateCheie.titlu }).from(rezultateCheie).where(and(eq(rezultateCheie.orgId, ctx.orgId), inArray(rezultateCheie.id, krIds))) : Promise.resolve([]),
    depIds.length ? ctx.db.select().from(activitati).where(and(eq(activitati.orgId, ctx.orgId), inArray(activitati.id, depIds))) : Promise.resolve([] as RandAct[]),
    ctx.db.select().from(blocaje).where(and(eq(blocaje.orgId, ctx.orgId), eq(blocaje.status, "deschis"), inArray(blocaje.activitateId, ids))),
    aprobatori.length ? ctx.db.select({ id: appUsers.id, nume: appUsers.name, email: appUsers.email }).from(appUsers).where(inArray(appUsers.id, aprobatori)) : Promise.resolve([]),
  ]);
  const numeAng = new Map(struct.angajati.map((a) => [a.id, a.nume]));
  const titluKr = new Map(kr.map((k) => [k.id, k.titlu]));
  const depMap = new Map(deps.map((d) => [d.id, d]));
  const obDep = deps.length ? await accesObiective(ctx, deps.map((d) => d.obiectivId).filter((x): x is string => !!x)) : new Map<string, AccesObiectiv>();
  const numeAprobator = new Map(apr.map((u) => [u.id, u.nume ?? u.email]));

  return vizibile.map((r) => {
    const obj = r.obiectivId ? ob.get(r.obiectivId) : undefined;
    const obiectivVizibil = obj ? vedeObiectiv(eu, obj) : false;
    const dep = r.dependeDe ? depMap.get(r.dependeDe) : undefined;
    const depVizibil = dep ? vizibilaActivitate(eu, dep, obDep) : false;
    const b = blo.find((x) => x.activitateId === r.id);
    const accesAct = { responsabilId: r.responsabilId, creatDe: r.creatDe };
    return {
      id: r.id,
      titlu: r.titlu,
      descriere: r.descriere,
      responsabilId: r.responsabilId,
      responsabilNume: r.responsabilId ? (numeAng.get(r.responsabilId) ?? null) : null,
      obiectivId: obiectivVizibil ? r.obiectivId : null,
      obiectivTitlu: obiectivVizibil && obj ? obj.titlu : null,
      rezultatId: obiectivVizibil ? r.rezultatId : null,
      rezultatTitlu: obiectivVizibil && r.rezultatId ? (titluKr.get(r.rezultatId) ?? null) : null,
      prioritate: r.prioritate as Prioritate,
      termen: r.termen,
      efortOre: r.efortOre,
      status: r.status as StatusActivitate,
      aprobareNecesara: r.aprobareNecesara,
      aprobata: !!r.aprobataLa,
      aprobataDeNume: r.aprobataDe ? (numeAprobator.get(r.aprobataDe) ?? null) : null,
      rezultatAsteptat: r.rezultatAsteptat,
      criteriuFinalizare: r.criteriuFinalizare,
      dependeDe: dep && r.dependeDe ? { id: r.dependeDe, titlu: depVizibil ? dep.titlu : "o activitate privată", status: dep.status as StatusActivitate } : null,
      recurenta: r.recurenta as ActivitateDto["recurenta"],
      sursa: r.sursa as ActivitateDto["sursa"],
      finalizatLa: r.finalizatLa ? r.finalizatLa.toISOString() : null,
      intarziata: esteIntarziata(r, azi),
      blocaj: b ? dtoBlocaj(b, { activitateTitlu: r.titlu, obiectivTitlu: null, numeAng, azi, poateInchide: poateInchideBlocaj(eu, b, accesAct) }) : null,
      poateEdita: poateEditaActivitate(eu, accesAct),
      poateAproba: r.aprobareNecesara && !r.aprobataLa && poateAproba(eu, accesAct),
    };
  });
}

const poateInchideBlocaj = (eu: Eu, b: RandBlocaj, act: { responsabilId: string | null; creatDe: string | null } | null) =>
  eu.admin || Boolean(eu.angajatId && (b.responsabilRezolvareId === eu.angajatId || b.raportatDeId === eu.angajatId)) || Boolean(act && poateEditaActivitate(eu, act));

function dtoBlocaj(b: RandBlocaj, c: { activitateTitlu: string | null; obiectivTitlu: string | null; numeAng: Map<string, string>; azi: string; poateInchide: boolean }): BlocajDto {
  return {
    id: b.id,
    activitateId: b.activitateId,
    activitateTitlu: c.activitateTitlu,
    obiectivId: b.obiectivId,
    obiectivTitlu: c.obiectivTitlu,
    motiv: b.motiv,
    rezolvatorId: b.responsabilRezolvareId,
    rezolvatorNume: b.responsabilRezolvareId ? (c.numeAng.get(b.responsabilRezolvareId) ?? null) : null,
    raportatDeNume: b.raportatDeId ? (c.numeAng.get(b.raportatDeId) ?? null) : null,
    termenRevenire: b.termenRevenire,
    necesitaDecizie: b.necesitaDecizie,
    status: b.status as BlocajDto["status"],
    rezolvare: b.rezolvare,
    deschisLa: b.deschisLa.toISOString(),
    rezolvatLa: b.rezolvatLa ? b.rezolvatLa.toISOString() : null,
    intarziat: b.status === "deschis" && b.termenRevenire < c.azi,
    poateInchide: c.poateInchide,
  };
}

// ───────── Activități: scriere ─────────

export async function salveazaActivitate(ctx: OrgContext, input: ActivitateInput): Promise<Rez<{ id: string }>> {
  const err = valideazaActivitate(input);
  if (err) return eroare(err);
  const struct = await incarcaStructura(ctx);
  const eu = struct.eu;
  const ang = new Map(struct.angajati.map((a) => [a.id, a]));
  const resp = ang.get(input.responsabilId as string);
  if (!resp || !resp.activ) return eroare("Persoana aleasă nu mai e activă în echipă.");
  if (!eu.admin && !(eu.angajatId && (resp.id === eu.angajatId || eu.subordonati.has(resp.id)))) return eroare("Poți crea activități pentru tine sau pentru oamenii din echipa ta.");

  let existent: RandAct | undefined;
  if (input.id) {
    [existent] = await ctx.db.select().from(activitati).where(and(eq(activitati.id, input.id), eq(activitati.orgId, ctx.orgId))).limit(1);
    if (!existent) return eroare("Activitatea nu mai există.");
    if (!poateEditaActivitate(eu, { responsabilId: existent.responsabilId, creatDe: existent.creatDe })) return eroare("Nu ai dreptul să modifici această activitate.");
    if (["finalizat", "anulat"].includes(existent.status) && (input.recurenta !== existent.recurenta || input.termen !== existent.termen)) return eroare("Activitatea e încheiată: redeschide-o ca să-i schimbi termenul sau recurența.");
  }

  if (input.obiectivId) {
    const acces = (await accesObiective(ctx, [input.obiectivId])).get(input.obiectivId);
    if (!acces || !vedeObiectiv(eu, acces)) return eroare("Obiectivul ales nu există sau nu îl poți vedea.");
    if (input.rezultatId) {
      const [kr] = await ctx.db.select({ o: rezultateCheie.obiectivId }).from(rezultateCheie).where(and(eq(rezultateCheie.id, input.rezultatId), eq(rezultateCheie.orgId, ctx.orgId))).limit(1);
      if (!kr || kr.o !== input.obiectivId) return eroare("Rezultatul-cheie ales nu aparține obiectivului.");
    }
  }

  if (input.dependeDe) {
    const toate = await ctx.db.select({ id: activitati.id, dep: activitati.dependeDe }).from(activitati).where(eq(activitati.orgId, ctx.orgId));
    const pe = new Map(toate.map((a) => [a.id, a.dep]));
    if (!pe.has(input.dependeDe)) return eroare("Activitatea de care depinde nu mai există.");
    if (input.id && dependentaCiclica(input.id, input.dependeDe, pe)) return eroare("Dependența ar forma un ciclu (activitățile s-ar aștepta una pe alta).");
  }

  const valori = {
    titlu: input.titlu.trim(),
    descriere: input.descriere?.trim() || null,
    responsabilId: resp.id,
    obiectivId: input.obiectivId || null,
    rezultatId: input.obiectivId ? input.rezultatId || null : null,
    prioritate: input.prioritate,
    termen: input.termen || null,
    efortOre: input.efortOre ?? null,
    aprobareNecesara: input.aprobareNecesara,
    rezultatAsteptat: input.rezultatAsteptat?.trim() || null,
    criteriuFinalizare: input.criteriuFinalizare?.trim() || null,
    dependeDe: input.dependeDe || null,
    recurenta: input.recurenta,
    updatedAt: new Date(),
  };
  if (existent) {
    const reset = !input.aprobareNecesara ? { aprobataDe: null, aprobataLa: null } : {};
    await ctx.db.update(activitati).set({ ...valori, ...reset }).where(and(eq(activitati.id, existent.id), eq(activitati.orgId, ctx.orgId)));
    if (existent.responsabilId !== resp.id) await audit(ctx, "activitate_realocata", "activitate", existent.id, { de: existent.responsabilId, la: resp.id, titlu: valori.titlu });
    return { ok: true, id: existent.id };
  }
  const [nou] = await ctx.db.insert(activitati).values({ ...valori, orgId: ctx.orgId, creatDe: ctx.userId }).returning({ id: activitati.id });
  return { ok: true, id: nou.id };
}

export async function schimbaStatusActivitate(ctx: OrgContext, id: string, status: StatusActivitate): Promise<Rez<{ urmatoareaId?: string }>> {
  if (!["de_facut", "in_lucru", "in_asteptare", "blocat", "finalizat", "anulat"].includes(status)) return eroare("Stare invalidă.");
  const [a] = await ctx.db.select().from(activitati).where(and(eq(activitati.id, id), eq(activitati.orgId, ctx.orgId))).limit(1);
  if (!a) return eroare("Activitatea nu mai există.");
  const struct = await incarcaStructura(ctx);
  if (!poateEditaActivitate(struct.eu, { responsabilId: a.responsabilId, creatDe: a.creatDe })) return eroare("Nu ai dreptul să modifici această activitate.");

  const [dep] = a.dependeDe ? await ctx.db.select({ titlu: activitati.titlu, status: activitati.status }).from(activitati).where(eq(activitati.id, a.dependeDe)).limit(1) : [undefined];
  const [{ n }] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(blocaje).where(and(eq(blocaje.activitateId, id), eq(blocaje.status, "deschis")));
  const e = valideazaTranzitie({ de: a.status as StatusActivitate, la: status, aprobareNecesara: a.aprobareNecesara, aprobata: !!a.aprobataLa, dependenta: dep ?? null, blocajDeschis: n > 0 });
  if (e) return eroare(e);
  if (a.status === status) return { ok: true };

  // Anularea unei activități blocate închide și blocajul ei.
  if (status === "anulat" && n > 0) await ctx.db.update(blocaje).set({ status: "anulat", rezolvatLa: new Date(), rezolvare: "Activitatea a fost anulată." }).where(and(eq(blocaje.activitateId, id), eq(blocaje.status, "deschis")));
  await ctx.db.update(activitati).set({ status, finalizatLa: status === "finalizat" ? new Date() : null, updatedAt: new Date() }).where(eq(activitati.id, id));

  let urmatoareaId: string | undefined;
  if (status === "finalizat" && a.recurenta !== "nu" && a.termen) {
    // Ocurența următoare: cheia „rec:<id>” împiedică dublarea dacă activitatea e redeschisă și finalizată din nou.
    const azi = aziRo();
    let termen = urmatoareaOcurenta(a.termen, a.recurenta as "saptamanal" | "lunar");
    for (let i = 0; i < 60 && termen < azi; i++) termen = urmatoareaOcurenta(termen, a.recurenta as "saptamanal" | "lunar");
    const [nou] = await ctx.db
      .insert(activitati)
      .values({
        orgId: ctx.orgId, titlu: a.titlu, descriere: a.descriere, responsabilId: a.responsabilId, obiectivId: a.obiectivId, rezultatId: a.rezultatId, prioritate: a.prioritate, termen, efortOre: a.efortOre,
        aprobareNecesara: a.aprobareNecesara, rezultatAsteptat: a.rezultatAsteptat, criteriuFinalizare: a.criteriuFinalizare, recurenta: a.recurenta, sursa: "manual", cheieAutomatizare: `rec:${a.id}`, creatDe: a.creatDe,
      })
      .onConflictDoNothing()
      .returning({ id: activitati.id });
    urmatoareaId = nou?.id;
  }
  if (status === "anulat" || a.status === "finalizat") await audit(ctx, `activitate_${status}`, "activitate", id, { titlu: a.titlu, de: a.status });
  return { ok: true, urmatoareaId };
}

export async function aprobaActivitate(ctx: OrgContext, id: string): Promise<Rez> {
  const [a] = await ctx.db.select().from(activitati).where(and(eq(activitati.id, id), eq(activitati.orgId, ctx.orgId))).limit(1);
  if (!a) return eroare("Activitatea nu mai există.");
  if (!a.aprobareNecesara) return eroare("Activitatea nu cere aprobare.");
  if (a.aprobataLa) return { ok: true };
  const struct = await incarcaStructura(ctx);
  if (!poateAproba(struct.eu, { responsabilId: a.responsabilId, creatDe: a.creatDe })) return eroare("Aprobarea o dă managerul persoanei sau un administrator.");
  await ctx.db.update(activitati).set({ aprobataDe: ctx.userId, aprobataLa: new Date(), updatedAt: new Date() }).where(eq(activitati.id, id));
  await audit(ctx, "activitate_aprobata", "activitate", id, { titlu: a.titlu });
  return { ok: true };
}

export async function stergeActivitate(ctx: OrgContext, id: string): Promise<Rez> {
  const [a] = await ctx.db.select().from(activitati).where(and(eq(activitati.id, id), eq(activitati.orgId, ctx.orgId))).limit(1);
  if (!a) return { ok: true };
  const struct = await incarcaStructura(ctx);
  if (!poateEditaActivitate(struct.eu, { responsabilId: a.responsabilId, creatDe: a.creatDe })) return eroare("Nu ai dreptul să ștergi această activitate.");
  await audit(ctx, "activitate_stearsa", "activitate", id, { titlu: a.titlu, status: a.status });
  await ctx.db.delete(activitati).where(and(eq(activitati.id, id), eq(activitati.orgId, ctx.orgId)));
  return { ok: true };
}

// ───────── Blocaje ─────────

export async function raporteazaBlocaj(ctx: OrgContext, input: BlocajInput): Promise<Rez<{ id: string }>> {
  const azi = aziRo();
  const err = valideazaBlocaj(input, azi);
  if (err) return eroare(err);
  const struct = await incarcaStructura(ctx);
  const eu = struct.eu;
  const rezolvator = struct.angajati.find((a) => a.id === input.responsabilRezolvareId);
  if (!rezolvator || !rezolvator.activ) return eroare("Persoana aleasă să rezolve blocajul nu e activă în echipă.");

  if (input.activitateId) {
    const [a] = await ctx.db.select().from(activitati).where(and(eq(activitati.id, input.activitateId), eq(activitati.orgId, ctx.orgId))).limit(1);
    if (!a) return eroare("Activitatea nu mai există.");
    if (!poateEditaActivitate(eu, { responsabilId: a.responsabilId, creatDe: a.creatDe })) return eroare("Nu ai dreptul să raportezi un blocaj pe această activitate.");
    if (!STATUSURI_DESCHISE.includes(a.status as StatusActivitate)) return eroare("Activitatea e încheiată, nu mai poate fi blocată.");
    const [{ n }] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(blocaje).where(and(eq(blocaje.activitateId, a.id), eq(blocaje.status, "deschis")));
    if (n > 0) return eroare("Activitatea are deja un blocaj deschis. Rezolvă-l sau amână-l pe cel existent.");
    const [b] = await ctx.db
      .insert(blocaje)
      .values({ orgId: ctx.orgId, activitateId: a.id, motiv: input.motiv.trim(), responsabilRezolvareId: rezolvator.id, raportatDeId: eu.angajatId, termenRevenire: input.termenRevenire, necesitaDecizie: input.necesitaDecizie })
      .returning({ id: blocaje.id });
    await ctx.db.update(activitati).set({ status: "blocat", updatedAt: new Date() }).where(eq(activitati.id, a.id));
    await audit(ctx, "blocaj_deschis", "activitate", a.id, { motiv: input.motiv.trim(), rezolvator: rezolvator.id, decizie: input.necesitaDecizie });
    return { ok: true, id: b.id };
  }

  const acces = (await accesObiective(ctx, [input.obiectivId as string])).get(input.obiectivId as string);
  if (!acces || !vedeObiectiv(eu, acces)) return eroare("Obiectivul nu există sau nu îl poți vedea.");
  if (acces.status !== "activ") return eroare("Obiectivul nu mai e activ.");
  if (!poateActualizaRezultat(eu, acces, null) && !poateEditaObiectiv(eu, acces)) return eroare("Doar cei implicați în obiectiv pot raporta un blocaj pe el.");
  const [b] = await ctx.db
    .insert(blocaje)
    .values({ orgId: ctx.orgId, obiectivId: acces.id, motiv: input.motiv.trim(), responsabilRezolvareId: rezolvator.id, raportatDeId: eu.angajatId, termenRevenire: input.termenRevenire, necesitaDecizie: input.necesitaDecizie })
    .returning({ id: blocaje.id });
  await audit(ctx, "blocaj_deschis", "obiectiv", acces.id, { motiv: input.motiv.trim(), rezolvator: rezolvator.id, decizie: input.necesitaDecizie });
  return { ok: true, id: b.id };
}

async function incarcaBlocajDeschis(ctx: OrgContext, id: string) {
  const [b] = await ctx.db.select().from(blocaje).where(and(eq(blocaje.id, id), eq(blocaje.orgId, ctx.orgId))).limit(1);
  if (!b) return { eroare: "Blocajul nu mai există." } as const;
  if (b.status !== "deschis") return { eroare: "Blocajul e deja închis." } as const;
  const struct = await incarcaStructura(ctx);
  const [act] = b.activitateId ? await ctx.db.select().from(activitati).where(eq(activitati.id, b.activitateId)).limit(1) : [undefined];
  const obAcces = b.obiectivId ? (await accesObiective(ctx, [b.obiectivId])).get(b.obiectivId) : undefined;
  const poate = poateInchideBlocaj(struct.eu, b, act ? { responsabilId: act.responsabilId, creatDe: act.creatDe } : null) || Boolean(obAcces && poateEditaObiectiv(struct.eu, obAcces));
  if (!poate) return { eroare: "Nu ai dreptul să modifici acest blocaj." } as const;
  return { b, act } as const;
}

export async function inchideBlocaj(ctx: OrgContext, id: string, status: "rezolvat" | "anulat", rezolvare: string): Promise<Rez> {
  const text = (rezolvare ?? "").trim().slice(0, 1000);
  if (status === "rezolvat" && text.length < 3) return eroare("Scrie pe scurt cum s-a rezolvat.");
  const c = await incarcaBlocajDeschis(ctx, id);
  if ("eroare" in c) return eroare(c.eroare as string);
  await ctx.db.update(blocaje).set({ status, rezolvare: text || null, rezolvatLa: new Date() }).where(eq(blocaje.id, id));
  if (c.act && c.act.status === "blocat") {
    const [{ n }] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(blocaje).where(and(eq(blocaje.activitateId, c.act.id), eq(blocaje.status, "deschis")));
    if (n === 0) await ctx.db.update(activitati).set({ status: "in_lucru", updatedAt: new Date() }).where(eq(activitati.id, c.act.id));
  }
  await audit(ctx, `blocaj_${status}`, c.act ? "activitate" : "obiectiv", c.act?.id ?? c.b.obiectivId ?? id, { rezolvare: text || null });
  return { ok: true };
}

export async function amanaBlocaj(ctx: OrgContext, id: string, termenNou: string): Promise<Rez> {
  const azi = aziRo();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(termenNou) || termenNou < azi) return eroare("Alege o dată din viitor.");
  const c = await incarcaBlocajDeschis(ctx, id);
  if ("eroare" in c) return eroare(c.eroare as string);
  await ctx.db.update(blocaje).set({ termenRevenire: termenNou }).where(eq(blocaje.id, id));
  return { ok: true };
}

export async function incarcaBlocaje(ctx: OrgContext, doarDeschise = true): Promise<BlocajDto[]> {
  const azi = aziRo();
  const struct = await incarcaStructura(ctx);
  const eu = struct.eu;
  const rows = await ctx.db
    .select()
    .from(blocaje)
    .where(and(eq(blocaje.orgId, ctx.orgId), doarDeschise ? eq(blocaje.status, "deschis") : sql`true`))
    .orderBy(asc(blocaje.termenRevenire))
    .limit(300);
  if (rows.length === 0) return [];
  const actIds = rows.map((r) => r.activitateId).filter((x): x is string => !!x);
  const acts = actIds.length ? await ctx.db.select().from(activitati).where(inArray(activitati.id, actIds)) : [];
  const ob = await accesObiective(ctx, [...rows.map((r) => r.obiectivId), ...acts.map((a) => a.obiectivId)].filter((x): x is string => !!x));
  const numeAng = new Map(struct.angajati.map((a) => [a.id, a.nume]));
  const iesire: BlocajDto[] = [];
  for (const b of rows) {
    const act = b.activitateId ? acts.find((a) => a.id === b.activitateId) : undefined;
    const obiectivId = b.obiectivId ?? act?.obiectivId ?? null;
    const implicat = Boolean(eu.angajatId && (b.responsabilRezolvareId === eu.angajatId || b.raportatDeId === eu.angajatId));
    const vizibil = eu.admin || implicat || (act ? vizibilaActivitate(eu, act, ob) : false) || (b.obiectivId ? Boolean(ob.get(b.obiectivId) && vedeObiectiv(eu, ob.get(b.obiectivId)!)) : false);
    if (!vizibil) continue;
    const obj = obiectivId ? ob.get(obiectivId) : undefined;
    iesire.push(dtoBlocaj(b, { activitateTitlu: act?.titlu ?? null, obiectivTitlu: obj && vedeObiectiv(eu, obj) ? obj.titlu : null, numeAng, azi, poateInchide: poateInchideBlocaj(eu, b, act ? { responsabilId: act.responsabilId, creatDe: act.creatDe } : null) || Boolean(obj && poateEditaObiectiv(eu, obj)) }));
  }
  return iesire;
}

// ───────── Absențe ─────────

export async function adaugaAbsenta(ctx: OrgContext, input: AbsentaInput): Promise<Rez<{ id: string }>> {
  const err = valideazaAbsenta(input);
  if (err) return eroare(err);
  const struct = await incarcaStructura(ctx);
  const eu = struct.eu;
  if (!struct.angajati.some((a) => a.id === input.angajatId)) return eroare("Angajatul nu există.");
  if (!(eu.admin || input.angajatId === eu.angajatId || eu.subordonati.has(input.angajatId))) return eroare("Absențele le înregistrează persoana însăși, managerul ei sau un administrator.");
  const [r] = await ctx.db.insert(angajatiAbsente).values({ orgId: ctx.orgId, angajatId: input.angajatId, tip: input.tip, dataStart: input.dataStart, dataSfarsit: input.dataSfarsit, nota: input.nota?.trim() || null }).returning({ id: angajatiAbsente.id });
  return { ok: true, id: r.id };
}

export async function stergeAbsenta(ctx: OrgContext, id: string): Promise<Rez> {
  const [a] = await ctx.db.select().from(angajatiAbsente).where(and(eq(angajatiAbsente.id, id), eq(angajatiAbsente.orgId, ctx.orgId))).limit(1);
  if (!a) return { ok: true };
  const struct = await incarcaStructura(ctx);
  const eu = struct.eu;
  if (!(eu.admin || a.angajatId === eu.angajatId || eu.subordonati.has(a.angajatId))) return eroare("Nu ai dreptul să ștergi această absență.");
  await ctx.db.delete(angajatiAbsente).where(eq(angajatiAbsente.id, id));
  return { ok: true };
}

// ───────── Echipă și capacitate ─────────

export const NR_SAPTAMANI_CAPACITATE = 6;

export async function incarcaEchipa(ctx: OrgContext, lunaStart: string): Promise<{ membri: MembruEchipa[]; luni: string[]; azi: string; euAngajatId: string | null; admin: boolean }> {
  const azi = aziRo();
  const luni0 = luniSaptamanii(lunaStart);
  const luni = Array.from({ length: NR_SAPTAMANI_CAPACITATE }, (_, i) => adauga(luni0, i * 7));
  const sfarsit = adauga(luni0, NR_SAPTAMANI_CAPACITATE * 7 - 1);
  const luniCurenta = luniSaptamanii(azi);
  const struct = await incarcaStructura(ctx);
  const eu = struct.eu;
  const [ang, dep, rol, abs, act, ob] = await Promise.all([
    ctx.db.select().from(angajati).where(eq(angajati.orgId, ctx.orgId)),
    ctx.db.select({ id: departments.id, nume: departments.nume }).from(departments).where(eq(departments.orgId, ctx.orgId)),
    ctx.db.select({ id: roluri.id, nume: roluri.nume }).from(roluri).where(eq(roluri.orgId, ctx.orgId)),
    ctx.db.select().from(angajatiAbsente).where(and(eq(angajatiAbsente.orgId, ctx.orgId), lte(angajatiAbsente.dataStart, sfarsit), gte(angajatiAbsente.dataSfarsit, luni0))),
    ctx.db.select().from(activitati).where(and(eq(activitati.orgId, ctx.orgId), inArray(activitati.status, STATUSURI_DESCHISE))),
    ctx.db.select({ r: obiective.responsabilId, n: sql<number>`count(*)::int` }).from(obiective).where(and(eq(obiective.orgId, ctx.orgId), eq(obiective.status, "activ"), lte(obiective.perioadaStart, azi), gte(obiective.perioadaEnd, azi))).groupBy(obiective.responsabilId),
  ]);
  const numeDep = new Map(dep.map((d) => [d.id, d.nume]));
  const numeRol = new Map(rol.map((r) => [r.id, r.nume]));
  const nume = new Map(struct.angajati.map((a) => [a.id, a.nume]));

  const membri: MembruEchipa[] = ang.map((a) => {
    const vedeDetalii = eu.admin || a.id === eu.angajatId || eu.subordonati.has(a.id);
    const absente = vedeDetalii ? abs.filter((x) => x.angajatId === a.id) : [];
    const ale = vedeDetalii ? act.filter((x) => x.responsabilId === a.id) : [];
    return {
      id: a.id,
      nume: nume.get(a.id) ?? a.nume,
      email: vedeDetalii ? a.email : null,
      rol: a.roleId ? (numeRol.get(a.roleId) ?? null) : null,
      departmentId: a.departmentId,
      departmentNume: a.departmentId ? (numeDep.get(a.departmentId) ?? null) : null,
      managerId: a.managerId,
      managerNume: a.managerId ? (nume.get(a.managerId) ?? null) : null,
      status: a.status,
      normaProcent: a.normaProcent,
      vedeDetalii,
      deschise: ale.length,
      blocate: ale.filter((x) => x.status === "blocat").length,
      intarziate: ale.filter((x) => esteIntarziata(x, azi)).length,
      obiectiveResponsabil: vedeDetalii ? (ob.find((o) => o.r === a.id)?.n ?? 0) : 0,
      absente: absente.map((x) => ({ id: x.id, angajatId: x.angajatId, tip: x.tip as AbsentaDto["tip"], dataStart: x.dataStart, dataSfarsit: x.dataSfarsit, nota: x.nota, poateSterge: eu.admin || x.angajatId === eu.angajatId || eu.subordonati.has(x.angajatId) })),
      saptamani: vedeDetalii
        ? luni.map((l) => {
            const cap = capacitateSaptamana({ luni: l, normaProcent: a.normaProcent, absente: absente.map((x) => ({ start: x.dataStart, end: x.dataSfarsit })) });
            const inc = incarcareSaptamana(ale.map((x) => ({ termen: x.termen, efortOre: x.efortOre, status: x.status })), l, l === luniCurenta);
            return { luni: l, capacitateOre: cap.ore, incarcareOre: inc.ore, fara_estimare: inc.fara_estimare, nrActivitati: inc.nr, zileAbsente: cap.zileAbsente, nivel: a.status === "activ" ? nivelIncarcare(inc.ore, cap.ore) : "indisponibil" };
          })
        : [],
    };
  });
  membri.sort((a, b) => a.nume.localeCompare(b.nume, "ro"));
  return { membri, luni, azi, euAngajatId: eu.angajatId, admin: eu.admin };
}

// ───────── Spațiul meu ─────────

export type SpatiulMeu = {
  azi: string;
  luni: string;
  eu: { angajatId: string; nume: string } | null;
  prioritati: ActivitateDto[];
  saptamana: { total: number; finalizate: number };
  blocaje: BlocajDto[];
  deAprobat: ActivitateDto[];
  rezultateDeActualizat: { obiectivId: string; obiectivTitlu: string; rezultatId: string; titlu: string; actualitate: string; ultimaActualizare: string | null }[];
  obiective: ObiectivDto[];
  capacitate: { luni: string; capacitateOre: number; incarcareOre: number; fara_estimare: number; nrActivitati: number; zileAbsente: number; nivel: string } | null;
};

export async function incarcaSpatiulMeu(ctx: OrgContext, start: string, end: string): Promise<SpatiulMeu> {
  const azi = aziRo();
  const luni = luniSaptamanii(azi);
  const duminica = adauga(luni, 6);
  const struct = await incarcaStructura(ctx);
  const me = struct.eu.angajatId ? struct.angajati.find((a) => a.id === struct.eu.angajatId) : undefined;
  const gol: SpatiulMeu = { azi, luni, eu: null, prioritati: [], saptamana: { total: 0, finalizate: 0 }, blocaje: [], deAprobat: [], rezultateDeActualizat: [], obiective: [], capacitate: null };
  if (!me) return gol;

  const [mele, saptamana, toateBlocajele, deAprobatRand, obiectiveTot] = await Promise.all([
    incarcaActivitati(ctx, { responsabilId: me.id, status: "deschise" }),
    incarcaActivitati(ctx, { responsabilId: me.id, status: "toate", start: luni, end: duminica }),
    incarcaBlocaje(ctx, true),
    incarcaActivitati(ctx, { status: "deschise" }),
    incarcaObiective(ctx, { start, end, status: "activ" }),
  ]);
  const prioritati = [...mele]
    .filter((a) => a.intarziata || a.prioritate === "critica" || a.prioritate === "mare" || (a.termen !== null && a.termen <= duminica))
    .sort((a, b) => Number(b.intarziata) - Number(a.intarziata) || ordine(a.prioritate) - ordine(b.prioritate) || (a.termen ?? "9999").localeCompare(b.termen ?? "9999"))
    .slice(0, 12);

  const obiectiveMele = obiectiveTot.obiective.filter((o) => o.responsabilId === me.id || o.colaboratori.some((c) => c.id === me.id) || o.rezultate.some((r) => r.responsabilId === me.id));
  const rezultateDeActualizat = obiectiveMele
    .flatMap((o) => o.rezultate.filter((r) => r.status === "activ" && r.sursa === "manual" && r.poateActualiza && (r.actualitate === "intarziata" || r.actualitate === "veche" || r.actualitate === "fara_date")).map((r) => ({ obiectivId: o.id, obiectivTitlu: o.titlu, rezultatId: r.id, titlu: r.titlu, actualitate: r.actualitate, ultimaActualizare: r.ultimaActualizare })))
    .slice(0, 10);

  const absente = await ctx.db.select().from(angajatiAbsente).where(and(eq(angajatiAbsente.angajatId, me.id), lte(angajatiAbsente.dataStart, duminica), gte(angajatiAbsente.dataSfarsit, luni)));
  const cap = capacitateSaptamana({ luni, normaProcent: me.normaProcent, absente: absente.map((x) => ({ start: x.dataStart, end: x.dataSfarsit })) });
  const inc = incarcareSaptamana(mele.map((x) => ({ termen: x.termen, efortOre: x.efortOre, status: x.status })), luni, true);

  return {
    azi,
    luni,
    eu: { angajatId: me.id, nume: me.nume },
    prioritati,
    saptamana: { total: saptamana.length, finalizate: saptamana.filter((a) => a.status === "finalizat").length },
    blocaje: toateBlocajele.filter((b) => b.rezolvatorId === me.id || b.poateInchide),
    deAprobat: deAprobatRand.filter((a) => a.poateAproba),
    rezultateDeActualizat,
    obiective: obiectiveMele,
    capacitate: { luni, capacitateOre: cap.ore, incarcareOre: inc.ore, fara_estimare: inc.fara_estimare, nrActivitati: inc.nr, zileAbsente: cap.zileAbsente, nivel: nivelIncarcare(inc.ore, cap.ore) },
  };
}

const ordine = (p: Prioritate) => ({ critica: 0, mare: 1, medie: 2, scazuta: 3 })[p];
