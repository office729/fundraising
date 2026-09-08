"use server";

import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import { inregistreazaAudit } from "@/lib/audit";
import { fundraisingBeneficiaries, fundraisingBeneficiaryInvites, fundraisingPages } from "@/lib/db/schema";
import { EMAIL_RE, normalizeazaEmail } from "@/lib/validation";

export type InvitaBeneficiarState = { error: string | null; token: string | null };

// Creează o invitație de beneficiar pentru o campanie — token-based, la fel
// ca invitațiile de echipă (src/app/(app)/[orgSlug]/echipa/actions.ts):
// generează link-ul, admin/agentul îl copiază și îl trimite manual
// (nu se trimite automat un email — la fel ca la echipă, nu doar la
// beneficiari, nu e o limitare specifică acestui flux). O campanie poate
// avea un singur beneficiar activ (verificat mai jos, nu doar prin UI).
export const invitaBeneficiarAction = withOrgAdmin(
  async (ctx, pageId: string, _prevState: InvitaBeneficiarState, formData: FormData): Promise<InvitaBeneficiarState> => {
    const emailRaw = String(formData.get("email") ?? "").trim();
    const email = normalizeazaEmail(emailRaw);
    if (!email || !EMAIL_RE.test(email)) {
      return { error: "Adresa de email nu e validă.", token: null };
    }

    const pagina = await ctx.db
      .select({ id: fundraisingPages.id })
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.id, pageId), eq(fundraisingPages.orgId, ctx.orgId)))
      .limit(1);
    if (!pagina[0]) return { error: "Pagina nu a fost găsită.", token: null };

    const existent = await ctx.db
      .select({ id: fundraisingBeneficiaries.id })
      .from(fundraisingBeneficiaries)
      .where(and(eq(fundraisingBeneficiaries.campaignPageId, pageId), eq(fundraisingBeneficiaries.status, "activ")))
      .limit(1);
    if (existent[0]) {
      return { error: "Această campanie are deja un cont de beneficiar activ.", token: null };
    }

    const token = randomUUID().replace(/-/g, "");
    await ctx.db.insert(fundraisingBeneficiaryInvites).values({
      campaignPageId: pageId,
      orgId: ctx.orgId,
      email,
      token,
      invitedBy: ctx.userId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    return { error: null, token };
  },
);

export type BeneficiarInviteRow = {
  id: string;
  email: string;
  token: string;
  createdAt: string;
  expiresAt: string;
};

export const listPendingBeneficiarInvites = withOrgAdmin(async (ctx, pageId: string): Promise<BeneficiarInviteRow[]> => {
  const rows = await ctx.db
    .select()
    .from(fundraisingBeneficiaryInvites)
    .where(and(eq(fundraisingBeneficiaryInvites.campaignPageId, pageId), eq(fundraisingBeneficiaryInvites.orgId, ctx.orgId)));
  return rows
    .filter((r) => !r.acceptedAt)
    .map((r) => ({
      id: r.id,
      email: r.email,
      token: r.token,
      createdAt: r.createdAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
    }));
});

// Dezactivează contul de beneficiar al unei campanii — soft (istoricul
// rămâne intact), reactivabil doar de admin printr-o nouă invitație.
export const dezactiveazaBeneficiarAction = withOrgAdmin(async (ctx, beneficiarId: string) => {
  await ctx.db
    .update(fundraisingBeneficiaries)
    .set({ status: "dezactivat" })
    .where(and(eq(fundraisingBeneficiaries.id, beneficiarId), eq(fundraisingBeneficiaries.orgId, ctx.orgId)));

  await inregistreazaAudit(ctx.db, {
    orgId: ctx.orgId,
    actorAppUserId: ctx.userId,
    actiune: "beneficiar_dezactivat",
    entitate: "fundraising_beneficiaries",
    entitateId: beneficiarId,
  });
});
