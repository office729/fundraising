"use server";

import { and, eq } from "drizzle-orm";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { angajati, crmKv, kpiAuditLog } from "@/lib/db/schema";
import { citestePermisiuni } from "@/lib/kpi-acces";
import { CHEIE_PERMISIUNI_KV, curataPermisiuni, type PermisiuniKpi } from "@/lib/kpi-permisiuni";

export const obtinePermisiuniAction = withOrgSession(async (ctx): Promise<PermisiuniKpi> => citestePermisiuni(ctx.db, ctx.orgId));

export const salveazaPermisiuniAction = withOrgAdmin(async (ctx, input: PermisiuniKpi): Promise<PermisiuniKpi> => {
  const noi = curataPermisiuni(input);
  const vechi = await citestePermisiuni(ctx.db, ctx.orgId);
  await ctx.db
    .insert(crmKv)
    .values({ orgId: ctx.orgId, path: CHEIE_PERMISIUNI_KV, data: noi, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [crmKv.orgId, crmKv.path], set: { data: noi, updatedAt: new Date() } });
  await ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune: "editeaza_permisiuni", entitate: "permisiuni", detalii: { vechi, noi } });
  return noi;
});

export type AngajatAccesibil = { id: string; nume: string; prenume: string | null; esteEu: boolean; poateAtribui: boolean; poateValori: boolean };

// Oamenii ale căror KPI le poți vedea (tu, echipa ta, tot departamentul dacă ești admin de departament; owner/admin: toți),
// fiecare cu ce ai voie să faci pe el — interfața arată doar butoanele permise; serverul le re-verifică la fiecare acțiune.
export const listeazaAngajatiAccesibiliAction = withOrgSession(async (ctx): Promise<AngajatAccesibil[]> => {
  const [toti, perm] = await Promise.all([
    ctx.db
      .select({ id: angajati.id, nume: angajati.nume, prenume: angajati.prenume, appUserId: angajati.appUserId, managerId: angajati.managerId, departmentId: angajati.departmentId, nivelAcces: angajati.nivelAcces })
      .from(angajati)
      .where(and(eq(angajati.orgId, ctx.orgId))),
    citestePermisiuni(ctx.db, ctx.orgId),
  ]);
  const admin = ctx.role === "owner" || ctx.role === "admin";
  const eu = toti.find((a) => a.appUserId === ctx.userId) ?? null;
  return toti
    .map((a) => {
      const propriu = eu?.id === a.id;
      const manager = Boolean(eu && !propriu && (a.managerId === eu.id || (eu.nivelAcces === "admin_departament" && eu.departmentId !== null && a.departmentId === eu.departmentId)));
      if (!(admin || propriu || manager)) return null;
      return {
        id: a.id,
        nume: a.nume,
        prenume: a.prenume,
        esteEu: propriu,
        poateAtribui: admin || (manager && perm.managerAtribuie),
        poateValori: admin || (propriu && perm.angajatValoriProprii) || (manager && perm.managerValori),
      };
    })
    .filter((x): x is AngajatAccesibil => x !== null)
    .sort((a, b) => a.nume.localeCompare(b.nume, "ro"));
});