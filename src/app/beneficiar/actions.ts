"use server";

import { and, eq } from "drizzle-orm";

import { headers } from "next/headers";

import { withBeneficiarSession } from "@/lib/auth/guard";
import { fundraisingCampaignAgents, fundraisingGroupPostingHistory, fundraisingMessages, fundraisingNotifications, fundraisingTasks } from "@/lib/db/schema";
import { notifica } from "@/lib/notifications";

export type TrimiteMesajBeneficiarState = { error: string | null; ok: boolean };

export const trimiteMesajBeneficiarAction = withBeneficiarSession(
  async (ctx, _prevState: TrimiteMesajBeneficiarState, formData: FormData): Promise<TrimiteMesajBeneficiarState> => {
    const continut = String(formData.get("continut") ?? "").trim();
    if (!continut) return { error: "Scrie un mesaj.", ok: false };

    await ctx.db.insert(fundraisingMessages).values({
      campaignPageId: ctx.campaignPageId,
      orgId: ctx.orgId,
      senderAppUserId: ctx.userId,
      senderNume: ctx.userName,
      senderEmail: ctx.userEmail,
      continut,
    });

    const agent = await ctx.db
      .select({ agentUserId: fundraisingCampaignAgents.agentUserId, agentEmail: fundraisingCampaignAgents.agentEmail })
      .from(fundraisingCampaignAgents)
      .where(and(eq(fundraisingCampaignAgents.campaignPageId, ctx.campaignPageId), eq(fundraisingCampaignAgents.active, true)))
      .limit(1);
    if (agent[0]) {
      const hdrs = await headers();
      const proto = hdrs.get("x-forwarded-proto") ?? "https";
      const link = `${proto}://${hdrs.get("host")}/${ctx.orgSlug}/crm/strangere-fonduri/${ctx.campaignPageId}`;
      await notifica(ctx.db, {
        appUserId: agent[0].agentUserId,
        tip: "mesaj_nou",
        titlu: `Mesaj nou de la beneficiarul campaniei „${ctx.campaignTitlu}”`,
        continut,
        link,
        email: agent[0].agentEmail,
      });
    }

    return { error: null, ok: true };
  },
);

// Beneficiarul marchează o sarcină proprie ca finalizată — RLS
// (fundraising_tasks_beneficiar_update) garantează scoparea pe campania lui.
export const finalizeazaSarcinaBeneficiarAction = withBeneficiarSession(async (ctx, taskId: string) => {
  await ctx.db
    .update(fundraisingTasks)
    .set({ status: "finalizata", completedAt: new Date() })
    .where(and(eq(fundraisingTasks.id, taskId), eq(fundraisingTasks.campaignPageId, ctx.campaignPageId)));
});

// Beneficiarul marchează „am publicat” într-un grup local — RLS
// (fundraising_group_posting_history_beneficiar_insert) garantează scoparea
// pe campania lui, nu poate marca postări pentru altă campanie.
export const marcheazaPublicatGrupAction = withBeneficiarSession(async (ctx, groupId: string) => {
  await ctx.db.insert(fundraisingGroupPostingHistory).values({
    groupId,
    campaignPageId: ctx.campaignPageId,
    orgId: ctx.orgId,
    marcatDe: ctx.userId,
  });
});

export const marcheazaNotificareCititaAction = withBeneficiarSession(async (ctx, notificareId: string) => {
  await ctx.db
    .update(fundraisingNotifications)
    .set({ citit: true })
    .where(and(eq(fundraisingNotifications.id, notificareId), eq(fundraisingNotifications.appUserId, ctx.userId)));
});

export const marcheazaToateNotificarileCititeAction = withBeneficiarSession(async (ctx) => {
  await ctx.db
    .update(fundraisingNotifications)
    .set({ citit: true })
    .where(and(eq(fundraisingNotifications.appUserId, ctx.userId), eq(fundraisingNotifications.citit, false)));
});
