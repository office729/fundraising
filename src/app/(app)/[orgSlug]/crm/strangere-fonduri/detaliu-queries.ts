import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import {
  appUsers,
  fundraisingCalendarItems,
  fundraisingGeneratedContent,
  fundraisingGroupPostingHistory,
  fundraisingInvoices,
  fundraisingLocalGroups,
  fundraisingMediaContacts,
  fundraisingMessages,
  fundraisingPages,
  fundraisingPressOutreachHistory,
  fundraisingPressReleases,
  fundraisingTaskAttachments,
  fundraisingTasks,
  memberships,
} from "@/lib/db/schema";

// Citirile paginii de detaliu a unei campanii, ca funcții simple care primesc un `ctx` DEJA deschis.
//
// Nu sunt acțiuni de server (fișierul nu are "use server"), deci nu pot fi apelate din browser: acțiunile
// `list*` din *-actions.ts le învelesc în `withOrgSession` și rămân neschimbate pentru apelanții lor, iar pagina
// de detaliu le rulează pe toate într-o SINGURĂ tranzacție (o conexiune din pool, un singur set de verificări de
// acces) în loc de ~13 tranzacții paralele pe un pool de 5 conexiuni.

type MemberRow = { userId: string; email: string; name: string | null; role: string };

export async function listMembersImpl(ctx: OrgContext): Promise<MemberRow[]> {
  return ctx.db
    .select({
      userId: appUsers.id,
      email: appUsers.email,
      name: appUsers.name,
      role: memberships.role,
    })
    .from(memberships)
    .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
    .where(eq(memberships.orgId, ctx.orgId));
}

// Nu se face JOIN pe app_users: staff-ul nu are politică RLS care să-i permită să vadă rândul app_users al
// beneficiarului, deci un INNER JOIN ar ascunde tăcut mesajele trimise de el — vezi comentariul din schema
// (fundraisingMessages.senderNume/senderEmail, denormalizate la trimitere).
export async function listMesajeCampanieImpl(ctx: OrgContext, pageId: string) {
  return ctx.db.select().from(fundraisingMessages).where(eq(fundraisingMessages.campaignPageId, pageId)).orderBy(desc(fundraisingMessages.createdAt));
}

export async function listCalendarCampanieImpl(ctx: OrgContext, pageId: string) {
  return ctx.db.select().from(fundraisingCalendarItems).where(eq(fundraisingCalendarItems.campaignPageId, pageId)).orderBy(fundraisingCalendarItems.ziua);
}

export async function listContinutCampanieImpl(ctx: OrgContext, pageId: string) {
  return ctx.db.select().from(fundraisingGeneratedContent).where(eq(fundraisingGeneratedContent.campaignPageId, pageId));
}

export async function listComunicatCampanieImpl(ctx: OrgContext, pageId: string) {
  const rows = await ctx.db
    .select()
    .from(fundraisingPressReleases)
    .where(eq(fundraisingPressReleases.campaignPageId, pageId))
    .orderBy(desc(fundraisingPressReleases.createdAt))
    .limit(1);
  return rows[0] ?? null;
}

// Contacte de presă recomandate pentru campanie — filtrate pe județul paginii, aceeași sursă globală ca panoul
// de administrare.
export async function listMediaContacteCampanieImpl(ctx: OrgContext, pageId: string) {
  const pagina = await ctx.db.select({ judet: fundraisingPages.judet }).from(fundraisingPages).where(eq(fundraisingPages.id, pageId)).limit(1);
  if (!pagina[0]?.judet) return [];
  return ctx.db
    .select()
    .from(fundraisingMediaContacts)
    .where(and(eq(fundraisingMediaContacts.orgId, ctx.orgId), eq(fundraisingMediaContacts.judet, pagina[0].judet)));
}

export async function listOutreachIstoricImpl(ctx: OrgContext, releaseId: string) {
  return ctx.db.select().from(fundraisingPressOutreachHistory).where(eq(fundraisingPressOutreachHistory.pressReleaseId, releaseId));
}

// Grupuri locale recomandate pentru campanie — filtrate pe județul paginii.
export async function listLocalGroupsCampanieImpl(ctx: OrgContext, pageId: string) {
  const pagina = await ctx.db.select({ judet: fundraisingPages.judet }).from(fundraisingPages).where(eq(fundraisingPages.id, pageId)).limit(1);
  if (!pagina[0]?.judet) return [];
  return ctx.db
    .select()
    .from(fundraisingLocalGroups)
    .where(and(eq(fundraisingLocalGroups.orgId, ctx.orgId), eq(fundraisingLocalGroups.judet, pagina[0].judet), eq(fundraisingLocalGroups.status, "activ")));
}

export async function listGrupuriPublicateCampanieImpl(ctx: OrgContext, pageId: string) {
  const rows = await ctx.db
    .select({ groupId: fundraisingGroupPostingHistory.groupId })
    .from(fundraisingGroupPostingHistory)
    .where(eq(fundraisingGroupPostingHistory.campaignPageId, pageId));
  return rows.map((r) => r.groupId);
}

export async function listFacturiCampanieImpl(ctx: OrgContext, pageId: string) {
  return ctx.db.select().from(fundraisingInvoices).where(eq(fundraisingInvoices.campaignPageId, pageId)).orderBy(desc(fundraisingInvoices.createdAt));
}

export async function listTaskuriCampanieImpl(ctx: OrgContext, pageId: string) {
  return ctx.db.select().from(fundraisingTasks).where(eq(fundraisingTasks.campaignPageId, pageId)).orderBy(asc(fundraisingTasks.dataLimita));
}

export async function listAttachmentsCampanieImpl(ctx: OrgContext, pageId: string) {
  const taskuri = await ctx.db.select({ id: fundraisingTasks.id }).from(fundraisingTasks).where(eq(fundraisingTasks.campaignPageId, pageId));
  const taskIds = taskuri.map((t) => t.id);
  if (!taskIds.length) return [];
  return ctx.db.select().from(fundraisingTaskAttachments).where(inArray(fundraisingTaskAttachments.taskId, taskIds));
}
