"use server";

import { and, asc, desc, eq } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import { appUsers, fundraisingAuditLog, fundraisingBeneficiaries, fundraisingCampaignAgents, fundraisingPages, fundraisingTasks, fundraisingUpdates } from "@/lib/db/schema";

const STAGNANT_ZILE = 14;

export const getPanouBeneficiari = withOrgAdmin(async (ctx) => {
  const beneficiari = await ctx.db
    .select({
      id: fundraisingBeneficiaries.id,
      email: fundraisingBeneficiaries.email,
      status: fundraisingBeneficiaries.status,
      createdAt: fundraisingBeneficiaries.createdAt,
      campaignPageId: fundraisingPages.id,
      campaignTitlu: fundraisingPages.titlu,
      campaignJudet: fundraisingPages.judet,
      campaignStatus: fundraisingPages.status,
      sumaStransa: fundraisingPages.sumaStransa,
      sumaTinta: fundraisingPages.sumaTinta,
    })
    .from(fundraisingBeneficiaries)
    .innerJoin(fundraisingPages, eq(fundraisingPages.id, fundraisingBeneficiaries.campaignPageId))
    .where(eq(fundraisingBeneficiaries.orgId, ctx.orgId))
    .orderBy(desc(fundraisingBeneficiaries.createdAt));

  const agentiActivi = await ctx.db
    .select({
      campaignPageId: fundraisingCampaignAgents.campaignPageId,
      agentNume: fundraisingCampaignAgents.agentNume,
      agentEmail: fundraisingCampaignAgents.agentEmail,
    })
    .from(fundraisingCampaignAgents)
    .where(and(eq(fundraisingCampaignAgents.orgId, ctx.orgId), eq(fundraisingCampaignAgents.active, true)));

  const taskuriNefinalizate = await ctx.db
    .select({
      id: fundraisingTasks.id,
      titlu: fundraisingTasks.titlu,
      tip: fundraisingTasks.tip,
      dataLimita: fundraisingTasks.dataLimita,
      campaignPageId: fundraisingPages.id,
      campaignTitlu: fundraisingPages.titlu,
    })
    .from(fundraisingTasks)
    .innerJoin(fundraisingPages, eq(fundraisingPages.id, fundraisingTasks.campaignPageId))
    .where(and(eq(fundraisingTasks.orgId, ctx.orgId), eq(fundraisingTasks.status, "de_facut")))
    .orderBy(asc(fundraisingTasks.dataLimita));

  const paginiActive = await ctx.db
    .select({ id: fundraisingPages.id, titlu: fundraisingPages.titlu, judet: fundraisingPages.judet })
    .from(fundraisingPages)
    .where(and(eq(fundraisingPages.orgId, ctx.orgId), eq(fundraisingPages.status, "activa")));

  const ultimeleActualizari = await ctx.db
    .select({ pageId: fundraisingUpdates.pageId, createdAt: fundraisingUpdates.createdAt })
    .from(fundraisingUpdates)
    .where(eq(fundraisingUpdates.orgId, ctx.orgId))
    .orderBy(desc(fundraisingUpdates.createdAt));

  const ultimaActualizarePerPagina = new Map<string, Date>();
  for (const u of ultimeleActualizari) {
    if (!ultimaActualizarePerPagina.has(u.pageId)) ultimaActualizarePerPagina.set(u.pageId, u.createdAt);
  }

  const pragStagnare = Date.now() - STAGNANT_ZILE * 24 * 60 * 60 * 1000;
  const campaniiStagnante = paginiActive
    .map((p) => {
      const ultima = ultimaActualizarePerPagina.get(p.id);
      const zileFaraActualizare = ultima ? Math.floor((Date.now() - ultima.getTime()) / (24 * 60 * 60 * 1000)) : null;
      return { id: p.id, titlu: p.titlu, judet: p.judet, ultimaActualizare: ultima?.toISOString() ?? null, zileFaraActualizare };
    })
    .filter((p) => !p.ultimaActualizare || new Date(p.ultimaActualizare).getTime() < pragStagnare);

  // Jurnal de audit: staff-la-staff, deci JOIN pe app_users e sigur aici
  // (nu e cazul blocat de RLS ca la beneficiar/agent — actorul e mereu un
  // membru al organizației, cu politica app_users_visible satisfăcută).
  const auditLog = await ctx.db
    .select({
      id: fundraisingAuditLog.id,
      actiune: fundraisingAuditLog.actiune,
      entitate: fundraisingAuditLog.entitate,
      entitateId: fundraisingAuditLog.entitateId,
      detalii: fundraisingAuditLog.detalii,
      createdAt: fundraisingAuditLog.createdAt,
      actorNume: appUsers.name,
      actorEmail: appUsers.email,
    })
    .from(fundraisingAuditLog)
    .leftJoin(appUsers, eq(appUsers.id, fundraisingAuditLog.actorAppUserId))
    .where(eq(fundraisingAuditLog.orgId, ctx.orgId))
    .orderBy(desc(fundraisingAuditLog.createdAt))
    .limit(100);

  const agentByPage = new Map(agentiActivi.map((a) => [a.campaignPageId, a]));

  return {
    beneficiari: beneficiari.map((b) => ({ ...b, agent: agentByPage.get(b.campaignPageId) ?? null })),
    taskuriNefinalizate,
    campaniiStagnante,
    auditLog,
  };
});
