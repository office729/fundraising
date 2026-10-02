"use server";

import { and, eq } from "drizzle-orm";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { angajati, departments } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";
import { obtineRezumateAngajati, type RezumatAngajat } from "@/lib/kpi-engine";

// Dashboard-uri agregate (Faza E) — Manager/Departament/Organizație. Citesc
// DOAR ultimele valori deja salvate (vezi obtineRezumateAngajati — 3
// interogări în bloc, niciodată o buclă per angajat). NU afișează clasament
// implicit (sortare după nume, nu după scor) — „Nu afișa implicit
// clasament. Nu crea competiție internă." din cerință.

export type EchipaManager = { areProfil: boolean; angajatNume: string | null; echipa: RezumatAngajat[] };

export const obtineEchipaManagerAction = withOrgSession(async (ctx): Promise<EchipaManager> => {
  const [eu] = await ctx.db.select({ id: angajati.id, nume: angajati.nume, prenume: angajati.prenume }).from(angajati).where(and(eq(angajati.orgId, ctx.orgId), eq(angajati.appUserId, ctx.userId))).limit(1);
  if (!eu) return { areProfil: false, angajatNume: null, echipa: [] };

  const rapoarte = await ctx.db.select({ id: angajati.id }).from(angajati).where(and(eq(angajati.orgId, ctx.orgId), eq(angajati.managerId, eu.id)));
  const echipa = await obtineRezumateAngajati(ctx.db, ctx.orgId, rapoarte.map((r) => r.id));
  echipa.sort((a, b) => a.nume.localeCompare(b.nume));

  return { areProfil: true, angajatNume: `${eu.nume} ${eu.prenume ?? ""}`.trim(), echipa };
});

export type DepartamentOptiune = { id: string; nume: string };

// Departamentele la care utilizatorul curent are acces de dashboard —
// owner/admin: toate; admin_departament: doar al lui.
export const listeazaDepartamenteAccesibileAction = withOrgSession(async (ctx): Promise<DepartamentOptiune[]> => {
  if (ctx.role === "owner" || ctx.role === "admin") {
    return ctx.db.select({ id: departments.id, nume: departments.nume }).from(departments).where(eq(departments.orgId, ctx.orgId)).orderBy(departments.nume);
  }
  const [eu] = await ctx.db
    .select({ departmentId: angajati.departmentId })
    .from(angajati)
    .where(and(eq(angajati.orgId, ctx.orgId), eq(angajati.appUserId, ctx.userId), eq(angajati.nivelAcces, "admin_departament")))
    .limit(1);
  if (!eu?.departmentId) return [];
  const [dept] = await ctx.db.select({ id: departments.id, nume: departments.nume }).from(departments).where(and(eq(departments.id, eu.departmentId), eq(departments.orgId, ctx.orgId))).limit(1);
  return dept ? [dept] : [];
});

export type DepartamentDashboard = { departamentNume: string; echipa: RezumatAngajat[] };

export const obtineDepartamentDashboardAction = withOrgSession(async (ctx, departmentId: string): Promise<DepartamentDashboard> => {
  const [dept] = await ctx.db.select({ nume: departments.nume }).from(departments).where(and(eq(departments.id, departmentId), eq(departments.orgId, ctx.orgId))).limit(1);
  if (!dept) throw new EroareUtilizator("Departamentul nu a fost găsit.");

  if (ctx.role !== "owner" && ctx.role !== "admin") {
    const [eu] = await ctx.db
      .select({ departmentId: angajati.departmentId })
      .from(angajati)
      .where(and(eq(angajati.orgId, ctx.orgId), eq(angajati.appUserId, ctx.userId), eq(angajati.nivelAcces, "admin_departament")))
      .limit(1);
    if (!eu || eu.departmentId !== departmentId) throw new EroareUtilizator("Nu ai acces la acest departament.");
  }

  const membri = await ctx.db.select({ id: angajati.id }).from(angajati).where(and(eq(angajati.orgId, ctx.orgId), eq(angajati.departmentId, departmentId)));
  const echipa = await obtineRezumateAngajati(ctx.db, ctx.orgId, membri.map((m) => m.id));
  echipa.sort((a, b) => a.nume.localeCompare(b.nume));

  return { departamentNume: dept.nume, echipa };
});

export type OrganizatieDashboard = {
  echipa: RezumatAngajat[];
  peDepartament: { departamentId: string | null; departamentNume: string; scorMediu: number | null; restante: number; membri: number }[];
};

export const obtineOrganizatieDashboardAction = withOrgAdmin(async (ctx): Promise<OrganizatieDashboard> => {
  const toti = await ctx.db.select({ id: angajati.id, departmentId: angajati.departmentId }).from(angajati).where(eq(angajati.orgId, ctx.orgId));
  const departamenteRows = await ctx.db.select({ id: departments.id, nume: departments.nume }).from(departments).where(eq(departments.orgId, ctx.orgId));
  const departamenteMap = new Map(departamenteRows.map((d) => [d.id, d.nume]));

  const echipa = await obtineRezumateAngajati(ctx.db, ctx.orgId, toti.map((a) => a.id));
  echipa.sort((a, b) => a.nume.localeCompare(b.nume));
  const rezumatMap = new Map(echipa.map((e) => [e.angajatId, e]));

  const grupuri = new Map<string | null, string[]>();
  for (const a of toti) {
    const lista = grupuri.get(a.departmentId) ?? [];
    lista.push(a.id);
    grupuri.set(a.departmentId, lista);
  }

  const peDepartament = [...grupuri.entries()].map(([departamentId, angajatIds]) => {
    const rezumate = angajatIds.map((id) => rezumatMap.get(id)).filter((r): r is RezumatAngajat => Boolean(r));
    const cuScor = rezumate.filter((r) => r.scorMediu !== null);
    const scorMediu = cuScor.length ? Math.round(cuScor.reduce((s, r) => s + (r.scorMediu as number), 0) / cuScor.length) : null;
    return {
      departamentId,
      departamentNume: departamentId ? (departamenteMap.get(departamentId) ?? "—") : "Fără departament",
      scorMediu,
      restante: rezumate.reduce((s, r) => s + r.restante, 0),
      membri: rezumate.length,
    };
  });
  peDepartament.sort((a, b) => a.departamentNume.localeCompare(b.departamentNume));

  return { echipa, peDepartament };
});
