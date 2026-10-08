import "server-only";

import { and, eq } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { angajati, crmKv } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";
import { CHEIE_PERMISIUNI_KV, curataPermisiuni, type PermisiuniKpi } from "@/lib/kpi-permisiuni";

// Cine are voie să facă ce pe datele KPI ale UNUI angajat. Aplicat pe server, în fiecare acțiune — nu doar prin butoane ascunse.
//  - citire: angajatul însuși, managerul lui direct, adminul departamentului lui, owner/admin;
//  - atribuire / target: owner/admin; manager direct și admin de departament doar dacă setarea „managerAtribuie” e pornită;
//  - valori manuale: owner/admin; angajatul pentru el însuși dacă „angajatValoriProprii”; manager/admin departament dacă „managerValori”.
export async function citestePermisiuni(db: OrgContext["db"], orgId: string): Promise<PermisiuniKpi> {
  const [r] = await db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, orgId), eq(crmKv.path, CHEIE_PERMISIUNI_KV))).limit(1);
  return curataPermisiuni(r?.data);
}

export type RelatieCuAngajat = { admin: boolean; propriu: boolean; manager: boolean };

export async function relatieCuAngajat(ctx: OrgContext, tintaId: string): Promise<RelatieCuAngajat> {
  const admin = ctx.role === "owner" || ctx.role === "admin";
  const [eu] = await ctx.db
    .select({ id: angajati.id, departmentId: angajati.departmentId, nivelAcces: angajati.nivelAcces })
    .from(angajati)
    .where(and(eq(angajati.orgId, ctx.orgId), eq(angajati.appUserId, ctx.userId)))
    .limit(1);
  const [t] = await ctx.db.select({ managerId: angajati.managerId, departmentId: angajati.departmentId }).from(angajati).where(and(eq(angajati.id, tintaId), eq(angajati.orgId, ctx.orgId))).limit(1);
  if (!t) throw new EroareUtilizator("Angajatul nu a fost găsit.");
  const propriu = Boolean(eu && eu.id === tintaId);
  const manager = Boolean(eu && !propriu && (t.managerId === eu.id || (eu.nivelAcces === "admin_departament" && eu.departmentId !== null && t.departmentId === eu.departmentId)));
  return { admin, propriu, manager };
}

export async function verificaCitire(ctx: OrgContext, tintaId: string): Promise<void> {
  const r = await relatieCuAngajat(ctx, tintaId);
  if (!(r.admin || r.propriu || r.manager)) throw new EroareUtilizator("Nu ai acces la datele acestui angajat.");
}

export async function poateAtribui(ctx: OrgContext, tintaId: string): Promise<boolean> {
  const r = await relatieCuAngajat(ctx, tintaId);
  if (r.admin) return true;
  return r.manager && (await citestePermisiuni(ctx.db, ctx.orgId)).managerAtribuie;
}

export async function poateIntroduceValori(ctx: OrgContext, tintaId: string): Promise<boolean> {
  const r = await relatieCuAngajat(ctx, tintaId);
  if (r.admin) return true;
  const p = await citestePermisiuni(ctx.db, ctx.orgId);
  return (r.propriu && p.angajatValoriProprii) || (r.manager && p.managerValori);
}