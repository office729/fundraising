import { and, asc, eq, inArray, lte, gte, ne, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import {
  activitati,
  angajati,
  blocaje,
  departments,
  kpiDefinitii,
  kpiValori,
  obiective,
  obiectiveColaboratori,
  obiectiveLegaturi,
  rezultateCheie,
} from "@/lib/db/schema";
import { construiesteEu, poateActualizaRezultat, poateEditaObiectiv, vedeObiectiv, type Eu } from "@/lib/performanta-acces";
import {
  actualitateDate,
  aziRo,
  progresObiectiv,
  progresRezultat,
  stareRitm,
  type Actualitate,
  type FrecventaActualizare,
  type Incredere,
  type Metoda,
  type TipTinta,
} from "@/lib/performanta-masurare";
import { METRICA_PE_ID, valoareCrm } from "@/lib/performanta-surse";
import type { AngajatMic, DepartamentMic, NivelObiectiv, ObiectivDto, OptiuniPerformanta, RezultatDto, StatusObiectiv, Vizibilitate } from "@/lib/performanta-tipuri";

// Citirea obiectivelor și rezultatelor-cheie, cu progresul calculat după metoda fiecăruia și cu valorile preluate automat din KPI / CRM.

type Ctx = Pick<OrgContext, "db" | "orgId" | "userId" | "role">;

export const numeComplet = (a: { nume: string; prenume: string | null }) => `${a.nume}${a.prenume ? ` ${a.prenume}` : ""}`.trim();

export async function incarcaStructura(ctx: Ctx): Promise<{ angajati: (AngajatMic & { appUserId: string | null; nivelAcces: string; normaProcent: number; roleId: string | null })[]; departamente: DepartamentMic[]; eu: Eu }> {
  const [ang, dep] = await Promise.all([
    ctx.db
      .select({ id: angajati.id, nume: angajati.nume, prenume: angajati.prenume, departmentId: angajati.departmentId, managerId: angajati.managerId, status: angajati.status, appUserId: angajati.appUserId, nivelAcces: angajati.nivelAcces, normaProcent: angajati.normaProcent, roleId: angajati.roleId })
      .from(angajati)
      .where(eq(angajati.orgId, ctx.orgId))
      .orderBy(asc(angajati.nume)),
    ctx.db.select({ id: departments.id, nume: departments.nume }).from(departments).where(eq(departments.orgId, ctx.orgId)).orderBy(asc(departments.nume)),
  ]);
  const lista = ang.map((a) => ({ id: a.id, nume: numeComplet(a), departmentId: a.departmentId, managerId: a.managerId, activ: a.status === "activ", appUserId: a.appUserId, nivelAcces: a.nivelAcces, normaProcent: a.normaProcent, roleId: a.roleId }));
  const eu = construiesteEu(
    ang.map((a) => ({ id: a.id, appUserId: a.appUserId, departmentId: a.departmentId, managerId: a.managerId, nivelAcces: a.nivelAcces, status: a.status })),
    ctx.userId,
    ctx.role === "owner" || ctx.role === "admin",
  );
  return { angajati: lista, departamente: dep, eu };
}

export async function incarcaOptiuni(ctx: Ctx): Promise<OptiuniPerformanta> {
  const [s, kpi] = await Promise.all([
    incarcaStructura(ctx),
    ctx.db.select({ id: kpiDefinitii.id, nume: kpiDefinitii.nume, unitate: kpiDefinitii.unitate, directie: kpiDefinitii.directie, frecventa: kpiDefinitii.frecventa }).from(kpiDefinitii).where(and(eq(kpiDefinitii.orgId, ctx.orgId), eq(kpiDefinitii.esteActiv, true))).orderBy(asc(kpiDefinitii.nume)),
  ]);
  return {
    angajati: s.angajati.map(({ id, nume, departmentId, managerId, activ }) => ({ id, nume, departmentId, managerId, activ })),
    departamente: s.departamente,
    kpiuri: kpi,
    euAngajatId: s.eu.angajatId,
    admin: s.eu.admin,
  };
}

export type FiltruObiective = {
  start: string;
  end: string;
  departmentId?: string | null;
  responsabilId?: string | null;
  nivel?: NivelObiectiv | null;
  status?: StatusObiectiv | "toate" | null;
  q?: string;
  doarIds?: string[];
};

type RandKr = typeof rezultateCheie.$inferSelect;

// Valorile rezultatelor-cheie legate de KPI sau CRM. Manuale: valoarea salvată. KPI: agregarea valorilor KPI din perioada obiectivului
// (sumă pentru ținte cumulative, ultima pentru cele periodice, sau cum e configurat). CRM: metrica organizației pe perioadă.
async function valoriSursate(ctx: Ctx, rks: RandKr[], perioade: Map<string, { start: string; end: string }>): Promise<Map<string, { valoare: number | null; ultima: Date | null }>> {
  const rez = new Map<string, { valoare: number | null; ultima: Date | null }>();
  const kpiKr = rks.filter((r) => r.sursa === "kpi" && r.kpiDefinitieId && r.kpiAngajatId);
  if (kpiKr.length > 0) {
    const randuri = await ctx.db
      .select({ ang: kpiValori.angajatId, def: kpiValori.kpiDefinitieId, start: kpiValori.perioadaStart, valoare: kpiValori.valoare, creat: kpiValori.createdAt })
      .from(kpiValori)
      .where(and(eq(kpiValori.orgId, ctx.orgId), inArray(kpiValori.kpiDefinitieId, [...new Set(kpiKr.map((r) => r.kpiDefinitieId!))]), inArray(kpiValori.angajatId, [...new Set(kpiKr.map((r) => r.kpiAngajatId!))])));
    for (const kr of kpiKr) {
      const p = perioade.get(kr.obiectivId)!;
      const ale = randuri.filter((x) => x.ang === kr.kpiAngajatId && x.def === kr.kpiDefinitieId && x.start >= p.start && x.start <= p.end).sort((a, b) => (a.start < b.start ? -1 : 1));
      if (ale.length === 0) {
        rez.set(kr.id, { valoare: null, ultima: null });
        continue;
      }
      const agregare = String((kr.sursaConfig as { agregare?: string } | null)?.agregare ?? (kr.tipTinta === "periodic" ? "ultima" : "suma"));
      const v = agregare === "ultima" ? ale[ale.length - 1].valoare : agregare === "medie" ? ale.reduce((s, x) => s + x.valoare, 0) / ale.length : ale.reduce((s, x) => s + x.valoare, 0);
      rez.set(kr.id, { valoare: v, ultima: ale.reduce((m, x) => (x.creat > m ? x.creat : m), ale[0].creat) });
    }
  }
  const crm = rks.filter((r) => r.sursa === "crm");
  const cache = new Map<string, number | null>();
  for (const kr of crm) {
    const metrica = String((kr.sursaConfig as { metrica?: string } | null)?.metrica ?? "");
    if (!METRICA_PE_ID.has(metrica)) {
      rez.set(kr.id, { valoare: null, ultima: null });
      continue;
    }
    const p = perioade.get(kr.obiectivId)!;
    const cheie = `${metrica}|${p.start}|${p.end}`;
    if (!cache.has(cheie)) cache.set(cheie, await valoareCrm(ctx.db, ctx.orgId, metrica, p.start, p.end));
    const v = cache.get(cheie) ?? null;
    rez.set(kr.id, { valoare: v, ultima: v === null ? null : new Date() });
  }
  return rez;
}

const SEVERITATE: Record<Actualitate, number> = { fara_date: 0, la_zi: 1, intarziata: 2, veche: 3 };

export async function incarcaObiective(ctx: Ctx, f: FiltruObiective): Promise<{ obiective: ObiectivDto[]; optiuni: OptiuniPerformanta }> {
  const azi = aziRo();
  const [struct, kpiDef] = await Promise.all([incarcaStructura(ctx), ctx.db.select({ id: kpiDefinitii.id, nume: kpiDefinitii.nume }).from(kpiDefinitii).where(eq(kpiDefinitii.orgId, ctx.orgId))]);
  const optiuni = await incarcaOptiuni(ctx);
  const numeAng = new Map(struct.angajati.map((a) => [a.id, a.nume]));
  const numeDep = new Map(struct.departamente.map((d) => [d.id, d.nume]));
  const numeKpi = new Map(kpiDef.map((k) => [k.id, k.nume]));

  const conditii = [eq(obiective.orgId, ctx.orgId), lte(obiective.perioadaStart, f.end), gte(obiective.perioadaEnd, f.start)];
  if (f.status === "activ" || f.status === "finalizat" || f.status === "anulat") conditii.push(eq(obiective.status, f.status));
  else if (f.status !== "toate") conditii.push(ne(obiective.status, "anulat"));
  if (f.departmentId) conditii.push(eq(obiective.departmentId, f.departmentId));
  if (f.responsabilId) conditii.push(eq(obiective.responsabilId, f.responsabilId));
  if (f.nivel) conditii.push(eq(obiective.nivel, f.nivel));
  if (f.doarIds) conditii.push(f.doarIds.length ? inArray(obiective.id, f.doarIds) : sql`false`);
  const randuri = await ctx.db.select().from(obiective).where(and(...conditii)).orderBy(asc(obiective.nivel), asc(obiective.titlu));
  if (randuri.length === 0) return { obiective: [], optiuni };

  const ids = randuri.map((o) => o.id);
  const [colab, rks, legaturi, act, blo] = await Promise.all([
    ctx.db.select({ obiectivId: obiectiveColaboratori.obiectivId, angajatId: obiectiveColaboratori.angajatId }).from(obiectiveColaboratori).where(inArray(obiectiveColaboratori.obiectivId, ids)),
    ctx.db.select().from(rezultateCheie).where(and(eq(rezultateCheie.orgId, ctx.orgId), inArray(rezultateCheie.obiectivId, ids))).orderBy(asc(rezultateCheie.ordine), asc(rezultateCheie.createdAt)),
    ctx.db
      .select({ id: obiectiveLegaturi.id, obiectivId: obiectiveLegaturi.obiectivId, legatDeId: obiectiveLegaturi.legatDeId, tip: obiectiveLegaturi.tip, titlu: obiective.titlu })
      .from(obiectiveLegaturi)
      .innerJoin(obiective, eq(obiective.id, obiectiveLegaturi.legatDeId))
      .where(inArray(obiectiveLegaturi.obiectivId, ids)),
    ctx.db
      .select({ obiectivId: activitati.obiectivId, total: sql<number>`count(*)::int`, gata: sql<number>`count(*) filter (where ${activitati.status} = 'finalizat')::int` })
      .from(activitati)
      .where(and(eq(activitati.orgId, ctx.orgId), inArray(activitati.obiectivId, ids), ne(activitati.status, "anulat")))
      .groupBy(activitati.obiectivId),
    ctx.db
      .select({ obiectivId: sql<string | null>`coalesce(${blocaje.obiectivId}, ${activitati.obiectivId})`, n: sql<number>`count(*)::int` })
      .from(blocaje)
      .leftJoin(activitati, eq(activitati.id, blocaje.activitateId))
      .where(and(eq(blocaje.orgId, ctx.orgId), eq(blocaje.status, "deschis")))
      .groupBy(sql`coalesce(${blocaje.obiectivId}, ${activitati.obiectivId})`),
  ]);

  const perioade = new Map(randuri.map((o) => [o.id, { start: o.perioadaStart, end: o.perioadaEnd }]));
  const valori = await valoriSursate(ctx, rks, perioade);

  const iesire: ObiectivDto[] = [];
  for (const o of randuri) {
    const colaboratori = colab.filter((c) => c.obiectivId === o.id).map((c) => c.angajatId);
    const acces = { vizibilitate: o.vizibilitate, responsabilId: o.responsabilId, departmentId: o.departmentId, creatDe: o.creatDe, colaboratori };
    if (!vedeObiectiv(struct.eu, acces)) continue;
    const editare = poateEditaObiectiv(struct.eu, acces);

    const rezultate: RezultatDto[] = rks
      .filter((r) => r.obiectivId === o.id)
      .map((r) => {
        const sursat = valori.get(r.id);
        const valoare = r.sursa === "manual" ? r.valoareCurenta : (sursat?.valoare ?? null);
        const ultima = r.sursa === "manual" ? r.ultimaActualizare : (sursat?.ultima ?? null);
        const m = progresRezultat({ metoda: r.metoda as Metoda, nivelInitial: r.nivelInitial, tinta: r.tinta, tintaMax: r.tintaMax, valoare });
        const sfarsit = r.termen && r.termen < o.perioadaEnd ? r.termen : o.perioadaEnd;
        const frecv = (r.sursa === "manual" ? r.frecventaActualizare : "zilnic") as FrecventaActualizare;
        const sursaEticheta = r.sursa === "kpi" ? `KPI: ${numeKpi.get(r.kpiDefinitieId ?? "") ?? "șters"}${r.kpiAngajatId ? ` (${numeAng.get(r.kpiAngajatId) ?? "—"})` : ""}` : r.sursa === "crm" ? `CRM: ${METRICA_PE_ID.get(String((r.sursaConfig as { metrica?: string } | null)?.metrica ?? ""))?.eticheta ?? "metrică necunoscută"}` : null;
        return {
          id: r.id, obiectivId: r.obiectivId, titlu: r.titlu, descriere: r.descriere, metoda: r.metoda as Metoda, tipTinta: r.tipTinta as TipTinta, unitate: r.unitate,
          nivelInitial: r.nivelInitial, tinta: r.tinta, tintaMax: r.tintaMax, valoare, pondere: r.pondere, sursa: r.sursa as RezultatDto["sursa"], sursaEticheta,
          kpiDefinitieId: r.kpiDefinitieId, kpiAngajatId: r.kpiAngajatId, sursaConfig: r.sursaConfig, frecventaActualizare: r.frecventaActualizare as FrecventaActualizare,
          ultimaActualizare: ultima ? ultima.toISOString() : null, incredere: (r.incredere as Incredere | null) ?? null, termen: r.termen, responsabilId: r.responsabilId,
          responsabilNume: r.responsabilId ? (numeAng.get(r.responsabilId) ?? null) : null, formula: r.formula, reguli: r.reguli, atribuire: r.atribuire, status: r.status as "activ" | "anulat",
          progres: m.progres, avertisment: m.avertisment, peste: m.peste,
          stare: stareRitm({ progres: m.progres, start: o.perioadaStart, end: sfarsit, azi, status: r.status === "anulat" ? "anulat" : o.status === "anulat" ? "anulat" : "activ" }),
          actualitate: actualitateDate(ultima, frecv),
          ordine: r.ordine,
          poateActualiza: r.sursa === "manual" && poateActualizaRezultat(struct.eu, acces, r.responsabilId),
        };
      });

    const agregat = progresObiectiv(rezultate.map((r) => ({ progres: r.progres, pondere: r.pondere, activ: r.status === "activ" })));
    const manuale = rezultate.filter((r) => r.status === "activ" && r.sursa === "manual");
    const actualitate = manuale.length === 0 ? (rezultate.some((r) => r.status === "activ") ? "la_zi" : "fara_date") : manuale.reduce<Actualitate>((w, r) => (SEVERITATE[r.actualitate] > SEVERITATE[w] ? r.actualitate : w), "fara_date");
    const ultimele = rezultate.map((r) => r.ultimaActualizare).filter((x): x is string => !!x).sort();
    const a = act.find((x) => x.obiectivId === o.id);
    iesire.push({
      id: o.id, parentId: o.parentId, nivel: o.nivel as NivelObiectiv, titlu: o.titlu, descriere: o.descriere, responsabilId: o.responsabilId, responsabilNume: o.responsabilId ? (numeAng.get(o.responsabilId) ?? null) : null,
      departmentId: o.departmentId, departmentNume: o.departmentId ? (numeDep.get(o.departmentId) ?? null) : null, perioadaStart: o.perioadaStart, perioadaEnd: o.perioadaEnd,
      status: o.status as StatusObiectiv, motivAnulare: o.motivAnulare, vizibilitate: o.vizibilitate as Vizibilitate,
      colaboratori: colaboratori.map((id) => struct.angajati.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x).map(({ id, nume, departmentId, managerId, activ }) => ({ id, nume, departmentId, managerId, activ })),
      rezultate, progres: agregat.progres, rkCuDate: agregat.cuDate, rkTotal: agregat.total,
      stare: stareRitm({ progres: agregat.progres, start: o.perioadaStart, end: o.perioadaEnd, azi, status: o.status as StatusObiectiv }),
      actualitate, nrActivitati: a?.total ?? 0, nrActivitatiFinalizate: a?.gata ?? 0, blocajeDeschise: blo.filter((b) => b.obiectivId === o.id).reduce((s, b) => s + b.n, 0),
      legaturi: legaturi.filter((l) => l.obiectivId === o.id).map((l) => ({ id: l.legatDeId, titlu: l.titlu, tip: l.tip })),
      poateEdita: editare, creatDe: o.creatDe, ultimaActualizare: ultimele.length ? ultimele[ultimele.length - 1] : null,
    });
  }

  const q = (f.q ?? "").trim().toLowerCase();
  return { obiective: q ? iesire.filter((o) => o.titlu.toLowerCase().includes(q) || o.rezultate.some((r) => r.titlu.toLowerCase().includes(q))) : iesire, optiuni };
}
