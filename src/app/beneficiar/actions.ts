"use server";

import { and, eq } from "drizzle-orm";

import { headers } from "next/headers";

import { reinnoiesteAcceptareTermeni } from "@/lib/auth/dal";
import { withBeneficiarSession } from "@/lib/auth/guard";
import { fundraisingCampaignAgents, fundraisingGroupPostingHistory, fundraisingMessages, fundraisingNotifications, fundraisingTasks } from "@/lib/db/schema";
import { BENEFICIAR_PORTAL_UI_DICT } from "@/lib/i18n/dictionaries/beneficiar-portal-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { notifica } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export type TrimiteMesajBeneficiarState = { error: string | null; ok: boolean };

export const trimiteMesajBeneficiarAction = withBeneficiarSession(
  async (ctx, _prevState: TrimiteMesajBeneficiarState, formData: FormData): Promise<TrimiteMesajBeneficiarState> => {
    const continut = String(formData.get("continut") ?? "").trim();
    if (!continut) return { error: BENEFICIAR_PORTAL_UI_DICT[await getLocale()].erori.scrieMesaj, ok: false };

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

export type SchimbaParolaState = { error: string | null; ok: boolean };

// Beneficiarul își schimbă singur parola (secțiunea 12 — securitate). Nu atinge
// datele campaniei (acelea rămân gestionate de echipă); `updateUser` afectează
// EXCLUSIV contul din sesiunea curentă, deci e sigur fără scope suplimentar.
export async function schimbaParolaBeneficiarAction(
  _prevState: SchimbaParolaState,
  formData: FormData,
): Promise<SchimbaParolaState> {
  const er = BENEFICIAR_PORTAL_UI_DICT[await getLocale()].erori;
  const parola = String(formData.get("parola") ?? "");
  const confirmare = String(formData.get("confirmare") ?? "");
  if (parola.length < 8) return { error: er.parolaMinim, ok: false };
  if (parola !== confirmare) return { error: er.parolaDiferite, ok: false };

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { error: er.sesiuneExpirata, ok: false };

  const { error } = await supabase.auth.updateUser({ password: parola });
  if (error) return { error: er.parolaNeschimbata, ok: false };

  return { error: null, ok: true };
}

// Reacceptarea Termenilor/Politicii (poarta din layout-ul beneficiarului).
export const acceptaTermeniBeneficiarAction = withBeneficiarSession(async (ctx) => {
  await reinnoiesteAcceptareTermeni(ctx.db, ctx.userId);
});
