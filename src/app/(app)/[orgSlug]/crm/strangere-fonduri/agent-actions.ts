"use server";

import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { inregistreazaAudit } from "@/lib/audit";
import { appUsers, fundraisingBeneficiaries, fundraisingCampaignAgents, fundraisingMessages, fundraisingPages } from "@/lib/db/schema";
import { notifica } from "@/lib/notifications";

export type AtribuieAgentState = { error: string | null; ok: boolean };

// Atribuie/schimbă agentul dedicat unei campanii — dezactivează rândul activ
// existent (dacă există) și inserează unul nou, ca istoricul atribuirilor să
// rămână interogabil (nu se suprascrie un rând).
export const atribuieAgentAction = withOrgAdmin(
  async (ctx, pageId: string, _prevState: AtribuieAgentState, formData: FormData): Promise<AtribuieAgentState> => {
    const agentUserId = String(formData.get("agentUserId") ?? "").trim();
    const bio = String(formData.get("bio") ?? "").trim();
    const programDisponibilitate = String(formData.get("programDisponibilitate") ?? "").trim();
    const contactAprobat = String(formData.get("contactAprobat") ?? "").trim();

    if (!agentUserId) return { error: "Alege un coleg din echipă.", ok: false };

    const pagina = await ctx.db
      .select({ id: fundraisingPages.id })
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.id, pageId), eq(fundraisingPages.orgId, ctx.orgId)))
      .limit(1);
    if (!pagina[0]) return { error: "Pagina nu a fost găsită.", ok: false };

    const agentUser = await ctx.db.select({ name: appUsers.name, email: appUsers.email }).from(appUsers).where(eq(appUsers.id, agentUserId)).limit(1);
    if (!agentUser[0]) return { error: "Colegul ales nu a fost găsit.", ok: false };

    await ctx.db
      .update(fundraisingCampaignAgents)
      .set({ active: false })
      .where(and(eq(fundraisingCampaignAgents.campaignPageId, pageId), eq(fundraisingCampaignAgents.active, true)));

    const [agentRow] = await ctx.db
      .insert(fundraisingCampaignAgents)
      .values({
        campaignPageId: pageId,
        orgId: ctx.orgId,
        agentUserId,
        agentNume: agentUser[0].name,
        agentEmail: agentUser[0].email,
        bio: bio || null,
        programDisponibilitate: programDisponibilitate || null,
        contactAprobat: contactAprobat || null,
        assignedBy: ctx.userId,
        active: true,
      })
      .returning({ id: fundraisingCampaignAgents.id });

    await inregistreazaAudit(ctx.db, {
      orgId: ctx.orgId,
      actorAppUserId: ctx.userId,
      actiune: "agent_atribuit",
      entitate: "fundraising_campaign_agents",
      entitateId: agentRow.id,
      detalii: { pageId, agentUserId, agentEmail: agentUser[0].email },
    });

    const beneficiar = await ctx.db
      .select({ appUserId: fundraisingBeneficiaries.appUserId, email: fundraisingBeneficiaries.email })
      .from(fundraisingBeneficiaries)
      .where(and(eq(fundraisingBeneficiaries.campaignPageId, pageId), eq(fundraisingBeneficiaries.status, "activ")))
      .limit(1);
    if (beneficiar[0]) {
      const hdrs = await headers();
      const proto = hdrs.get("x-forwarded-proto") ?? "https";
      const link = `${proto}://${hdrs.get("host")}/beneficiar/agentul-meu`;
      await notifica(ctx.db, {
        appUserId: beneficiar[0].appUserId,
        tip: "agent_atribuit",
        titlu: "Ai un agent dedicat",
        continut: `${agentUser[0].name || agentUser[0].email} este acum agentul tău dedicat.`,
        link,
        email: beneficiar[0].email,
      });
    }

    return { error: null, ok: true };
  },
);

// Eliberează campania — fără agent atribuit, până se alege altul.
export const elibereazaAgentAction = withOrgAdmin(async (ctx, campaignAgentId: string) => {
  await ctx.db
    .update(fundraisingCampaignAgents)
    .set({ active: false })
    .where(and(eq(fundraisingCampaignAgents.id, campaignAgentId), eq(fundraisingCampaignAgents.orgId, ctx.orgId)));
});

export type TrimiteMesajState = { error: string | null; ok: boolean };

// Mesaj trimis de un membru al echipei (de obicei agentul, dar orice membru
// cu acces la campanie poate scrie) către beneficiar — fir simplu, scopat pe
// campanie (vezi fundraising_messages_tenant_isolation).
export const trimiteMesajStaffAction = withOrgAdmin(
  async (ctx, pageId: string, _prevState: TrimiteMesajState, formData: FormData): Promise<TrimiteMesajState> => {
    const continut = String(formData.get("continut") ?? "").trim();
    if (!continut) return { error: "Scrie un mesaj.", ok: false };

    await ctx.db.insert(fundraisingMessages).values({
      campaignPageId: pageId,
      orgId: ctx.orgId,
      senderAppUserId: ctx.userId,
      senderNume: ctx.userName,
      senderEmail: ctx.userEmail,
      continut,
    });

    const beneficiar = await ctx.db
      .select({ appUserId: fundraisingBeneficiaries.appUserId, email: fundraisingBeneficiaries.email })
      .from(fundraisingBeneficiaries)
      .where(and(eq(fundraisingBeneficiaries.campaignPageId, pageId), eq(fundraisingBeneficiaries.status, "activ")))
      .limit(1);
    if (beneficiar[0]) {
      const hdrs = await headers();
      const proto = hdrs.get("x-forwarded-proto") ?? "https";
      const link = `${proto}://${hdrs.get("host")}/beneficiar/agentul-meu`;
      await notifica(ctx.db, {
        appUserId: beneficiar[0].appUserId,
        tip: "mesaj_nou",
        titlu: "Mesaj nou de la echipă",
        continut,
        link,
        email: beneficiar[0].email,
      });
    }

    return { error: null, ok: true };
  },
);

// Nu se face JOIN pe app_users: staff-ul nu are politică RLS care să-i
// permită să vadă rândul app_users al beneficiarului, deci un INNER JOIN ar
// ascunde tăcut mesajele trimise de el — vezi comentariul din schema
// (fundraisingMessages.senderNume/senderEmail, denormalizate la trimitere).
export const listMesajeCampanie = withOrgSession(async (ctx, pageId: string) => {
  return ctx.db.select().from(fundraisingMessages).where(eq(fundraisingMessages.campaignPageId, pageId)).orderBy(desc(fundraisingMessages.createdAt));
});
