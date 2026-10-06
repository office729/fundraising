"use server";

import { and, asc, eq } from "drizzle-orm";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { kpiAuditLog, kpiFunnelEtape, kpiFunnels } from "@/lib/db/schema";
import { EroareUtilizator } from "@/lib/erori";

// Funnel Builder (Faza F) — momentan un instrument de CONFIGURARE (admin
// definește etapele unui funnel generic, ex. "Lead → Contactat → Întâlnire →
// Sponsorizare"), fără conectare la date reale încă: niciun modul CRM nu
// scrie azi evenimente pe etape de funnel generic (companiile au propriul
// `company_stage_log`, separat). Afișarea unui funnel cu numere reale e un
// pas ulterior, odată ce un modul sursă e ales explicit per funnel.

export type EtapaFunnelRand = { id: string; nume: string; ordine: number; culoare: string | null };
export type FunnelRand = { id: string; nume: string; aplicaPe: string | null; etape: EtapaFunnelRand[] };

export const listeazaFunnelsAction = withOrgSession(async (ctx): Promise<FunnelRand[]> => {
  const funnels = await ctx.db.select({ id: kpiFunnels.id, nume: kpiFunnels.nume, aplicaPe: kpiFunnels.aplicaPe }).from(kpiFunnels).where(eq(kpiFunnels.orgId, ctx.orgId)).orderBy(asc(kpiFunnels.createdAt));
  const etape = await ctx.db
    .select({ id: kpiFunnelEtape.id, funnelId: kpiFunnelEtape.funnelId, nume: kpiFunnelEtape.nume, ordine: kpiFunnelEtape.ordine, culoare: kpiFunnelEtape.culoare })
    .from(kpiFunnelEtape)
    .innerJoin(kpiFunnels, eq(kpiFunnels.id, kpiFunnelEtape.funnelId))
    .where(eq(kpiFunnels.orgId, ctx.orgId))
    .orderBy(asc(kpiFunnelEtape.ordine));

  return funnels.map((f) => ({ ...f, etape: etape.filter((e) => e.funnelId === f.id).map(({ id, nume, ordine, culoare }) => ({ id, nume, ordine, culoare })) }));
});

export const creeazaFunnelAction = withOrgAdmin(async (ctx, nume: string, aplicaPe: string | null) => {
  if (!nume.trim()) throw new EroareUtilizator("Numele funnel-ului e obligatoriu.");
  const [rand] = await ctx.db.insert(kpiFunnels).values({ orgId: ctx.orgId, nume: nume.trim(), aplicaPe }).returning({ id: kpiFunnels.id });
  await ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune: "creeaza", entitate: "funnel", entitateId: rand.id, detalii: { nume } });
  return rand.id;
});

export const stergeFunnelAction = withOrgAdmin(async (ctx, id: string) => {
  await ctx.db.delete(kpiFunnelEtape).where(eq(kpiFunnelEtape.funnelId, id));
  await ctx.db.delete(kpiFunnels).where(and(eq(kpiFunnels.id, id), eq(kpiFunnels.orgId, ctx.orgId)));
  await ctx.db.insert(kpiAuditLog).values({ orgId: ctx.orgId, actorUserId: ctx.userId, actiune: "sterge", entitate: "funnel", entitateId: id, detalii: {} });
});

export const adaugaEtapaAction = withOrgAdmin(async (ctx, funnelId: string, nume: string, culoare: string | null) => {
  if (!nume.trim()) throw new EroareUtilizator("Numele etapei e obligatoriu.");
  const existente = await ctx.db.select({ ordine: kpiFunnelEtape.ordine }).from(kpiFunnelEtape).where(eq(kpiFunnelEtape.funnelId, funnelId));
  const ordineMax = existente.reduce((max, e) => Math.max(max, e.ordine), -1);
  await ctx.db.insert(kpiFunnelEtape).values({ funnelId, nume: nume.trim(), ordine: ordineMax + 1, culoare });
});

export const stergeEtapaAction = withOrgAdmin(async (ctx, id: string) => {
  await ctx.db.delete(kpiFunnelEtape).where(eq(kpiFunnelEtape.id, id));
});

// Reordonare prin butoane sus/jos — simplu, accesibil de la tastatură, fără
// dependință nouă de drag-and-drop pentru un tabel cu, de regulă, 3-7 etape.
export const reordoneazaEtapaAction = withOrgAdmin(async (ctx, funnelId: string, id: string, directie: "sus" | "jos") => {
  const etape = await ctx.db.select({ id: kpiFunnelEtape.id, ordine: kpiFunnelEtape.ordine }).from(kpiFunnelEtape).where(eq(kpiFunnelEtape.funnelId, funnelId)).orderBy(asc(kpiFunnelEtape.ordine));
  const idx = etape.findIndex((e) => e.id === id);
  const vecinIdx = directie === "sus" ? idx - 1 : idx + 1;
  if (idx === -1 || vecinIdx < 0 || vecinIdx >= etape.length) return;
  const curent = etape[idx];
  const vecin = etape[vecinIdx];
  await ctx.db.update(kpiFunnelEtape).set({ ordine: vecin.ordine }).where(eq(kpiFunnelEtape.id, curent.id));
  await ctx.db.update(kpiFunnelEtape).set({ ordine: curent.ordine }).where(eq(kpiFunnelEtape.id, vecin.id));
});
