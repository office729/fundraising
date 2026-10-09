import { and, eq, inArray, ne, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { activitati, blocaje, obiective } from "@/lib/db/schema";
import { vedeActivitate } from "@/lib/performanta-acces";
import { incarcaObiective, incarcaStructura } from "@/lib/performanta-date";
import { aziRo } from "@/lib/performanta-masurare";
import { perioadaVecina, rezolvaPerioada } from "@/lib/performanta-perioada";
import { construiesteRecomandari, type BlocajDecizie, type MuncaAngajat, type Recomandare } from "@/lib/performanta-recomandari";
import type { ObiectivDto, OptiuniPerformanta } from "@/lib/performanta-tipuri";

// Datele paginii „Prezentare generală”: obiectivele perioadei, comparația cu perioada anterioară, blocajele care cer decizie,
// distribuția muncii deschise și acțiunile recomandate. Totul respectă vizibilitatea utilizatorului curent.

export type Termen = { id: string; titlu: string; termen: string; responsabilNume: string | null; prioritate: string; obiectivTitlu: string | null };
export type Comparatie = { progresMediu: number | null; nrObiective: number; cuDate: number };

export type PrezentareDto = {
  perioada: { cod: string; start: string; end: string; eticheta: string };
  anterioara: { eticheta: string } & Comparatie;
  curenta: Comparatie;
  obiective: ObiectivDto[];
  optiuni: OptiuniPerformanta;
  blocaje: BlocajDecizie[];
  munca: MuncaAngajat[];
  termene: Termen[];
  recomandari: Recomandare[];
  azi: string;
  actualizatLa: string;
};

const sumar = (l: ObiectivDto[]): Comparatie => {
  const active = l.filter((o) => o.status !== "anulat");
  const cuProgres = active.filter((o) => o.progres !== null);
  // media simplă a progresului obiectivelor care au date (fiecare plafonat la 100%, ca un obiectiv depășit să nu ascundă altul rămas în urmă)
  return {
    progresMediu: cuProgres.length === 0 ? null : cuProgres.reduce((s, o) => s + Math.min(1, o.progres ?? 0), 0) / cuProgres.length,
    nrObiective: active.length,
    cuDate: cuProgres.length,
  };
};

export async function incarcaPrezentare(ctx: OrgContext, codPerioada: string | null, departmentId: string | null): Promise<PrezentareDto> {
  const azi = aziRo();
  const perioada = rezolvaPerioada(codPerioada, azi);
  const anterioara = perioadaVecina(perioada, -1);
  const [curent, precedent, struct] = await Promise.all([
    incarcaObiective(ctx, { start: perioada.start, end: perioada.end, departmentId }),
    incarcaObiective(ctx, { start: anterioara.start, end: anterioara.end, departmentId }),
    incarcaStructura(ctx),
  ]);
  const numeAng = new Map(struct.angajati.map((a) => [a.id, a]));

  const [deschise, blo, termeneRand] = await Promise.all([
    ctx.db
      .select({ responsabilId: activitati.responsabilId, creatDe: activitati.creatDe, obiectivId: activitati.obiectivId, status: activitati.status, termen: activitati.termen, ore: activitati.efortOre })
      .from(activitati)
      .where(and(eq(activitati.orgId, ctx.orgId), inArray(activitati.status, ["de_facut", "in_lucru", "in_asteptare", "blocat"]))),
    ctx.db
      .select({ b: blocaje, actTitlu: activitati.titlu, actObiectiv: activitati.obiectivId, obTitlu: obiective.titlu })
      .from(blocaje)
      .leftJoin(activitati, eq(activitati.id, blocaje.activitateId))
      .leftJoin(obiective, eq(obiective.id, blocaje.obiectivId))
      .where(and(eq(blocaje.orgId, ctx.orgId), eq(blocaje.status, "deschis"), eq(blocaje.necesitaDecizie, true))),
    ctx.db
      .select({ id: activitati.id, titlu: activitati.titlu, termen: activitati.termen, prioritate: activitati.prioritate, responsabilId: activitati.responsabilId, creatDe: activitati.creatDe, obiectivId: activitati.obiectivId })
      .from(activitati)
      .where(and(eq(activitati.orgId, ctx.orgId), ne(activitati.status, "finalizat"), ne(activitati.status, "anulat"), sql`${activitati.termen} is not null`, sql`${activitati.termen} between ${azi}::date and (${azi}::date + 14)`))
      .orderBy(activitati.termen)
      .limit(40),
  ]);

  // Vizibilitatea activităților: managerul vede echipa lui, angajatul pe ale lui (vezi performanta-acces).
  const vizibile = (responsabilId: string | null, creatDe: string | null, obiectivId: string | null) =>
    vedeActivitate(struct.eu, { responsabilId, creatDe }, !!obiectivId && curent.obiective.some((o) => o.id === obiectivId));

  const munca = new Map<string, MuncaAngajat>();
  for (const a of deschise) {
    if (!a.responsabilId) continue;
    if (departmentId && numeAng.get(a.responsabilId)?.departmentId !== departmentId) continue;
    if (!vizibile(a.responsabilId, a.creatDe, a.obiectivId)) continue;
    const nume = numeAng.get(a.responsabilId)?.nume ?? "—";
    const m = munca.get(a.responsabilId) ?? { angajatId: a.responsabilId, nume, deschise: 0, blocate: 0, intarziate: 0, ore: 0 };
    m.deschise += 1;
    if (a.status === "blocat") m.blocate += 1;
    if (a.termen && a.termen < azi) m.intarziate += 1;
    m.ore += a.ore ?? 0;
    munca.set(a.responsabilId, m);
  }

  const blocaje_: BlocajDecizie[] = blo
    .filter((r) => vizibile(r.b.responsabilRezolvareId ?? r.b.raportatDeId, null, r.b.obiectivId ?? r.actObiectiv))
    .map((r) => ({
      id: r.b.id,
      motiv: r.b.motiv,
      termenRevenire: r.b.termenRevenire,
      contextTitlu: r.actTitlu ?? r.obTitlu ?? null,
      rezolvator: r.b.responsabilRezolvareId ? (numeAng.get(r.b.responsabilRezolvareId)?.nume ?? null) : null,
      intarziat: r.b.termenRevenire < azi,
    }));

  const termene: Termen[] = termeneRand
    .filter((t) => vizibile(t.responsabilId, t.creatDe, t.obiectivId))
    .map((t) => ({
      id: t.id,
      titlu: t.titlu,
      termen: t.termen as string,
      responsabilNume: t.responsabilId ? (numeAng.get(t.responsabilId)?.nume ?? null) : null,
      prioritate: t.prioritate,
      obiectivTitlu: t.obiectivId ? (curent.obiective.find((o) => o.id === t.obiectivId)?.titlu ?? null) : null,
    }));

  // Ordine alfabetică, nu după volum: pagina nu clasifică oamenii.
  const munciLista = [...munca.values()].sort((a, b) => a.nume.localeCompare(b.nume, "ro"));
  return {
    perioada,
    anterioara: { eticheta: anterioara.eticheta, ...sumar(precedent.obiective) },
    curenta: sumar(curent.obiective),
    obiective: curent.obiective,
    optiuni: curent.optiuni,
    blocaje: blocaje_,
    munca: munciLista,
    termene,
    recomandari: construiesteRecomandari({ obiective: curent.obiective, blocaje: blocaje_, munca: munciLista, azi }),
    azi,
    actualizatLa: new Date().toISOString(),
  };
}

