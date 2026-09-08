"use server";

import { and, eq } from "drizzle-orm";

import { withBeneficiarSession } from "@/lib/auth/guard";
import { fundraisingMessages, fundraisingTasks } from "@/lib/db/schema";

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
