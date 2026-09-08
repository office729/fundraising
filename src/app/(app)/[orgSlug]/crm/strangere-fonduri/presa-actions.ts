"use server";

import { and, desc, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { inregistreazaAudit } from "@/lib/audit";
import {
  fundraisingGroupPostingHistory,
  fundraisingLocalGroups,
  fundraisingMediaContacts,
  fundraisingPages,
  fundraisingPressOutreachHistory,
  fundraisingPressReleases,
} from "@/lib/db/schema";
import { genereazaComunicatPresa, type DateCampanie } from "@/lib/promovare/generator";

async function dateCampanie(
  db: { select: typeof import("@/lib/db").db.select },
  pageId: string,
  orgId: string,
  orgSlug: string,
  orgName: string,
): Promise<DateCampanie | null> {
  const rows = await db
    .select()
    .from(fundraisingPages)
    .where(and(eq(fundraisingPages.id, pageId), eq(fundraisingPages.orgId, orgId)))
    .limit(1);
  const pagina = rows[0];
  if (!pagina) return null;
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const url = `${proto}://${hdrs.get("host")}/strangere-fonduri/${orgSlug}/${pagina.slug}`;
  return { titlu: pagina.titlu, poveste: pagina.poveste, orgName, url, sumaStransa: pagina.sumaStransa, sumaTinta: pagina.sumaTinta };
}

// Regenerează comunicatul de presă al campaniei — pornește mereu ca 'draft',
// din șablonul determinist deja scris (genereazaComunicatPresa); dacă exista
// deja unul, îl înlocuiește (istoricul de trimitere ține de comunicatul
// vechi prin fk, dar nu mai contează odată ce textul s-a schimbat).
export const genereazaComunicatAction = withOrgAdmin(async (ctx, pageId: string) => {
  const date = await dateCampanie(ctx.db, pageId, ctx.orgId, ctx.orgSlug, ctx.orgName);
  if (!date) return { error: "Pagina nu a fost găsită.", ok: false };

  await ctx.db.delete(fundraisingPressReleases).where(and(eq(fundraisingPressReleases.campaignPageId, pageId), eq(fundraisingPressReleases.status, "draft")));

  await ctx.db.insert(fundraisingPressReleases).values({
    campaignPageId: pageId,
    orgId: ctx.orgId,
    continut: genereazaComunicatPresa(date),
    status: "draft",
  });

  return { error: null, ok: true };
});

export const listComunicatCampanie = withOrgSession(async (ctx, pageId: string) => {
  const rows = await ctx.db
    .select()
    .from(fundraisingPressReleases)
    .where(eq(fundraisingPressReleases.campaignPageId, pageId))
    .orderBy(desc(fundraisingPressReleases.createdAt))
    .limit(1);
  return rows[0] ?? null;
});

export const aprobaComunicatAction = withOrgAdmin(async (ctx, releaseId: string) => {
  await ctx.db
    .update(fundraisingPressReleases)
    .set({ status: "aprobat", aprobatDe: ctx.userId })
    .where(and(eq(fundraisingPressReleases.id, releaseId), eq(fundraisingPressReleases.orgId, ctx.orgId)));

  await inregistreazaAudit(ctx.db, {
    orgId: ctx.orgId,
    actorAppUserId: ctx.userId,
    actiune: "comunicat_aprobat",
    entitate: "fundraising_press_releases",
    entitateId: releaseId,
  });
});

// Contacte de presă recomandate pentru campanie — filtrate pe județul
// paginii, aceeași sursă globală ca panoul de administrare.
export const listMediaContacteCampanie = withOrgSession(async (ctx, pageId: string) => {
  const pagina = await ctx.db.select({ judet: fundraisingPages.judet }).from(fundraisingPages).where(eq(fundraisingPages.id, pageId)).limit(1);
  if (!pagina[0]?.judet) return [];
  return ctx.db
    .select()
    .from(fundraisingMediaContacts)
    .where(and(eq(fundraisingMediaContacts.orgId, ctx.orgId), eq(fundraisingMediaContacts.judet, pagina[0].judet)));
});

export const marcheazaOutreachAction = withOrgAdmin(async (ctx, releaseId: string, mediaContactId: string) => {
  await ctx.db.insert(fundraisingPressOutreachHistory).values({
    pressReleaseId: releaseId,
    mediaContactId,
    orgId: ctx.orgId,
  });
});

export const listOutreachIstoric = withOrgSession(async (ctx, releaseId: string) => {
  return ctx.db.select().from(fundraisingPressOutreachHistory).where(eq(fundraisingPressOutreachHistory.pressReleaseId, releaseId));
});

// Grupuri locale recomandate pentru campanie — filtrate pe județul paginii.
export const listLocalGroupsCampanie = withOrgSession(async (ctx, pageId: string) => {
  const pagina = await ctx.db.select({ judet: fundraisingPages.judet }).from(fundraisingPages).where(eq(fundraisingPages.id, pageId)).limit(1);
  if (!pagina[0]?.judet) return [];
  return ctx.db
    .select()
    .from(fundraisingLocalGroups)
    .where(and(eq(fundraisingLocalGroups.orgId, ctx.orgId), eq(fundraisingLocalGroups.judet, pagina[0].judet), eq(fundraisingLocalGroups.status, "activ")));
});

export const listGrupuriPublicateCampanie = withOrgSession(async (ctx, pageId: string) => {
  const rows = await ctx.db
    .select({ groupId: fundraisingGroupPostingHistory.groupId })
    .from(fundraisingGroupPostingHistory)
    .where(eq(fundraisingGroupPostingHistory.campaignPageId, pageId));
  return rows.map((r) => r.groupId);
});
