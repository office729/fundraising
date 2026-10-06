"use server";

import { and, eq } from "drizzle-orm";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { kpiAuditLog, kpiDefinitii, kpiProfiluriSezoniere, kpiProfiluriSezoniereItemi } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";

// Profiluri KPI sezoniere — se aplică ORG-WIDE pe durata lor (nu per
// atribuire): în intervalul [dataStart, dataSfarsit], KPI-urile incluse în
// profil folosesc targetul/ponderea din profil, nu cele normale din
// kpi_atribuiri. După perioadă, revine automat la profilul standard — pur și
// simplu nu se mai potrivește intervalul, nimic de "dezactivat" manual.

export type ProfilSezonierItemRand = { kpiDefinitieId: string; kpiNume: string; targetOverride: number | null; pondereOverride: number | null };
export type ProfilSezonierRand = { id: string; nume: string; dataStart: string; dataSfarsit: string; recurent: boolean; itemi: ProfilSezonierItemRand[] };

export const listeazaProfiluriSezoniereAction = withOrgSession(async (ctx): Promise<ProfilSezonierRand[]> => {
  const profiluri = await ctx.db
    .select({ id: kpiProfiluriSezoniere.id, nume: kpiProfiluriSezoniere.nume, dataStart: kpiProfiluriSezoniere.dataStart, dataSfarsit: kpiProfiluriSezoniere.dataSfarsit, recurent: kpiProfiluriSezoniere.recurent })
    .from(kpiProfiluriSezoniere)
    .where(eq(kpiProfiluriSezoniere.orgId, ctx.orgId))
    .orderBy(kpiProfiluriSezoniere.dataStart);

  const itemi = await ctx.db
    .select({ profilId: kpiProfiluriSezoniereItemi.profilId, kpiDefinitieId: kpiProfiluriSezoniereItemi.kpiDefinitieId, kpiNume: kpiDefinitii.nume, targetOverride: kpiProfiluriSezoniereItemi.targetOverride, pondereOverride: kpiProfiluriSezoniereItemi.pondereOverride })
    .from(kpiProfiluriSezoniereItemi)
    .innerJoin(kpiDefinitii, eq(kpiDefinitii.id, kpiProfiluriSezoniereItemi.kpiDefinitieId))
    .innerJoin(kpiProfiluriSezoniere, eq(kpiProfiluriSezoniere.id, kpiProfiluriSezoniereItemi.profilId))
    .where(eq(kpiProfiluriSezoniere.orgId, ctx.orgId));

  return profiluri.map((p) => ({
    ...p,
    itemi: itemi.filter((i) => i.profilId === p.id).map(({ kpiDefinitieId, kpiNume, targetOverride, pondereOverride }) => ({ kpiDefinitieId, kpiNume, targetOverride: targetOverride as number | null, pondereOverride })),
  }));
});

export type ProfilSezonierInput = {
  nume: string;
  dataStart: string;
  dataSfarsit: string;
  recurent: boolean;
  itemi: { kpiDefinitieId: string; targetOverride: number | null; pondereOverride: number | null }[];
};

export const creeazaProfilSezonierAction = withOrgAdmin(async (ctx, input: ProfilSezonierInput) => {
  if (!input.nume.trim()) throw new EroareUtilizator("Numele profilului e obligatoriu.");
  if (input.dataSfarsit < input.dataStart) throw new EroareUtilizator("Data de sfârșit nu poate fi înainte de data de start.");
  const [rand] = await ctx.db
    .insert(kpiProfiluriSezoniere)
    .values({ orgId: ctx.orgId, nume: input.nume.trim(), dataStart: input.dataStart, dataSfarsit: input.dataSfarsit, recurent: input.recurent })
    .returning({ id: kpiProfiluriSezoniere.id });
  if (input.itemi.length > 0) {
    await ctx.db.insert(kpiProfiluriSezoniereItemi).values(input.itemi.map((i) => ({ profilId: rand.id, kpiDefinitieId: i.kpiDefinitieId, targetOverride: i.targetOverride, pondereOverride: i.pondereOverride })));
  }
  await ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune: "creeaza", entitate: "profil_sezonier", entitateId: rand.id, detalii: { nume: input.nume } });
});

export const stergeProfilSezonierAction = withOrgAdmin(async (ctx, id: string) => {
  await ctx.db.delete(kpiProfiluriSezoniereItemi).where(eq(kpiProfiluriSezoniereItemi.profilId, id));
  await ctx.db.delete(kpiProfiluriSezoniere).where(and(eq(kpiProfiluriSezoniere.id, id), eq(kpiProfiluriSezoniere.orgId, ctx.orgId)));
  await ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune: "sterge", entitate: "profil_sezonier", entitateId: id, detalii: {} });
});
