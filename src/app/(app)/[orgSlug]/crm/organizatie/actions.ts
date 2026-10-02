"use server";

import { and, eq } from "drizzle-orm";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { angajati, departments, kpiAuditLog, roluri } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";

// Modulul „Organizație & Echipă" (Faza A a modulului KPI generic) — orice
// membru al org-ului poate CITI structura (organigramă vizibilă echipei),
// doar owner/admin pot scrie. Nivelurile Manager/Admin Departament (coloana
// angajati.nivel_acces) nu dau drept de SCRIERE aici — ele scopează doar
// vizibilitatea KPI (fazele C+), construită separat.

// --- Departamente ------------------------------------------------------

export type DepartamentRand = { id: string; nume: string; descriere: string | null; parentId: string | null };

export const listeazaDepartamenteAction = withOrgSession(async (ctx): Promise<DepartamentRand[]> => {
  return ctx.db.select({ id: departments.id, nume: departments.nume, descriere: departments.descriere, parentId: departments.parentId }).from(departments).where(eq(departments.orgId, ctx.orgId)).orderBy(departments.nume);
});

// `functiePrincipala` (opțional) — dacă e completată, se creează și un rol
// cu acel nume, legat direct de departamentul nou, ca să nu fie nevoie să
// treci separat prin tab-ul Roluri pentru cea mai simplă structură (un
// departament, o funcție).
export const creeazaDepartamentAction = withOrgAdmin(async (ctx, nume: string, descriere: string | null, functiePrincipala: string | null) => {
  if (!nume.trim()) throw new EroareUtilizator("Numele departamentului e obligatoriu.");
  const [rand] = await ctx.db.insert(departments).values({ orgId: ctx.orgId, nume: nume.trim(), descriere }).returning({ id: departments.id });
  await ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune: "creeaza", entitate: "departament", entitateId: rand.id, detalii: { nume } });
  if (functiePrincipala?.trim()) {
    await ctx.db.insert(roluri).values({ orgId: ctx.orgId, nume: functiePrincipala.trim(), departmentId: rand.id });
  }
});

export const actualizeazaDepartamentAction = withOrgAdmin(async (ctx, id: string, nume: string, descriere: string | null) => {
  if (!nume.trim()) throw new EroareUtilizator("Numele departamentului e obligatoriu.");
  const r = await ctx.db.update(departments).set({ nume: nume.trim(), descriere }).where(and(eq(departments.id, id), eq(departments.orgId, ctx.orgId))).returning({ id: departments.id });
  if (!r[0]) throw new EroareUtilizator("Departamentul nu a fost găsit.");
});

export const stergeDepartamentAction = withOrgAdmin(async (ctx, id: string) => {
  // Rolurile/angajații legați rămân (department_id → null, pattern set null
  // deja în schemă) — ștergerea unui departament nu șterge echipa din el.
  await ctx.db.update(departments).set({ parentId: null }).where(and(eq(departments.parentId, id), eq(departments.orgId, ctx.orgId)));
  await ctx.db.delete(departments).where(and(eq(departments.id, id), eq(departments.orgId, ctx.orgId)));
});

// --- Roluri --------------------------------------------------------------

export type RolRand = { id: string; nume: string; descriere: string | null; responsabilitati: string | null; departmentId: string | null };

export const listeazaRoluriAction = withOrgSession(async (ctx): Promise<RolRand[]> => {
  return ctx.db
    .select({ id: roluri.id, nume: roluri.nume, descriere: roluri.descriere, responsabilitati: roluri.responsabilitati, departmentId: roluri.departmentId })
    .from(roluri)
    .where(eq(roluri.orgId, ctx.orgId))
    .orderBy(roluri.nume);
});

export const creeazaRolAction = withOrgAdmin(async (ctx, nume: string, descriere: string | null, responsabilitati: string | null, departmentId: string | null) => {
  if (!nume.trim()) throw new EroareUtilizator("Numele rolului e obligatoriu.");
  const [rand] = await ctx.db.insert(roluri).values({ orgId: ctx.orgId, nume: nume.trim(), descriere, responsabilitati, departmentId }).returning({ id: roluri.id });
  await ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune: "creeaza", entitate: "rol", entitateId: rand.id, detalii: { nume } });
});

export const actualizeazaRolAction = withOrgAdmin(
  async (ctx, id: string, nume: string, descriere: string | null, responsabilitati: string | null, departmentId: string | null) => {
    if (!nume.trim()) throw new EroareUtilizator("Numele rolului e obligatoriu.");
    const r = await ctx.db
      .update(roluri)
      .set({ nume: nume.trim(), descriere, responsabilitati, departmentId })
      .where(and(eq(roluri.id, id), eq(roluri.orgId, ctx.orgId)))
      .returning({ id: roluri.id });
    if (!r[0]) throw new EroareUtilizator("Rolul nu a fost găsit.");
  },
);

export const stergeRolAction = withOrgAdmin(async (ctx, id: string) => {
  await ctx.db.update(angajati).set({ roleId: null }).where(and(eq(angajati.roleId, id), eq(angajati.orgId, ctx.orgId)));
  await ctx.db.delete(roluri).where(and(eq(roluri.id, id), eq(roluri.orgId, ctx.orgId)));
});

// --- Angajați --------------------------------------------------------------

export type AngajatRand = {
  id: string;
  nume: string;
  prenume: string | null;
  email: string | null;
  telefon: string | null;
  roleId: string | null;
  departmentId: string | null;
  managerId: string | null;
  dataInceperii: string | null;
  status: "activ" | "concediu" | "suspendat" | "inactiv";
  programLucru: "norma_intreaga" | "part_time" | null;
  normaProcent: number;
  locatie: string | null;
  responsabilitati: string | null;
  nivelAcces: "membru" | "manager" | "admin_departament";
};

export const listeazaAngajatiAction = withOrgSession(async (ctx): Promise<AngajatRand[]> => {
  return ctx.db
    .select({
      id: angajati.id,
      nume: angajati.nume,
      prenume: angajati.prenume,
      email: angajati.email,
      telefon: angajati.telefon,
      roleId: angajati.roleId,
      departmentId: angajati.departmentId,
      managerId: angajati.managerId,
      dataInceperii: angajati.dataInceperii,
      status: angajati.status,
      programLucru: angajati.programLucru,
      normaProcent: angajati.normaProcent,
      locatie: angajati.locatie,
      responsabilitati: angajati.responsabilitati,
      nivelAcces: angajati.nivelAcces,
    })
    .from(angajati)
    .where(eq(angajati.orgId, ctx.orgId))
    .orderBy(angajati.nume);
});

export type AngajatInput = {
  nume: string;
  prenume: string | null;
  email: string | null;
  telefon: string | null;
  roleId: string | null;
  departmentId: string | null;
  managerId: string | null;
  dataInceperii: string | null;
  status: "activ" | "concediu" | "suspendat" | "inactiv";
  programLucru: "norma_intreaga" | "part_time" | null;
  normaProcent: number;
  locatie: string | null;
  responsabilitati: string | null;
  nivelAcces: "membru" | "manager" | "admin_departament";
};

export const creeazaAngajatAction = withOrgAdmin(async (ctx, input: AngajatInput) => {
  if (!input.nume.trim()) throw new EroareUtilizator("Numele angajatului e obligatoriu.");
  const [rand] = await ctx.db.insert(angajati).values({ orgId: ctx.orgId, ...input, nume: input.nume.trim() }).returning({ id: angajati.id });
  await ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune: "creeaza", entitate: "angajat", entitateId: rand.id, detalii: { nume: input.nume } });
});

export const actualizeazaAngajatAction = withOrgAdmin(async (ctx, id: string, input: AngajatInput) => {
  if (!input.nume.trim()) throw new EroareUtilizator("Numele angajatului e obligatoriu.");
  if (input.managerId === id) throw new EroareUtilizator("Un angajat nu poate fi propriul său manager.");
  const r = await ctx.db
    .update(angajati)
    .set({ ...input, nume: input.nume.trim() })
    .where(and(eq(angajati.id, id), eq(angajati.orgId, ctx.orgId)))
    .returning({ id: angajati.id });
  if (!r[0]) throw new EroareUtilizator("Angajatul nu a fost găsit.");
});

export const stergeAngajatAction = withOrgAdmin(async (ctx, id: string) => {
  await ctx.db.update(angajati).set({ managerId: null }).where(and(eq(angajati.managerId, id), eq(angajati.orgId, ctx.orgId)));
  await ctx.db.delete(angajati).where(and(eq(angajati.id, id), eq(angajati.orgId, ctx.orgId)));
});
