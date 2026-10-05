"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { aiConfigurat, genereazaContinutCanalAI } from "@/lib/ai";
import { limitaAIDepasita, MESAJ_LIMITA_AI } from "@/lib/ai-limit";
import { withOrgAdmin, withOrgFaze, withOrgSession } from "@/lib/auth/guard";
import { listComunicatCampanieImpl, listGrupuriPublicateCampanieImpl, listLocalGroupsCampanieImpl, listMediaContacteCampanieImpl, listOutreachIstoricImpl } from "./detaliu-queries";
import { inregistreazaAudit } from "@/lib/audit";
import {
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

// Generează comunicatul CU AI (secțiunea 6) — reutilizează canalul "comunicat"
// din generatorul AI, cu fallback la șablonul determinist când AI nu e configurat
// sau eșuează. Pornește tot ca 'draft'; înlocuiește draftul existent.
export const genereazaComunicatAIAction = withOrgFaze<
  [string],
  { date: DateCampanie },
  Awaited<ReturnType<typeof genereazaContinutCanalAI>>,
  { error: string | null; ok: boolean; aiFolosit?: boolean }
>({
  admin: true,
  pregateste: async (ctx, pageId) => {
    const date = await dateCampanie(ctx.db, pageId, ctx.orgId, ctx.orgSlug, ctx.orgName);
    if (!date) return { gata: { error: "Pagina nu a fost găsită.", ok: false } };
    if (!aiConfigurat())
      return { gata: { error: "AI-ul nu e configurat (ANTHROPIC_API_KEY lipsește). Folosește «Generează (șablon)».", ok: false } };
    if (await limitaAIDepasita(ctx)) return { gata: { error: MESAJ_LIMITA_AI, ok: false } };
    return { pregatit: { date } };
  },
  extern: ({ date }) => genereazaContinutCanalAI(date, "comunicat"),
  salveaza: async (ctx, { date }, ai, pageId) => {
    const continut = ai?.textComplet ?? genereazaComunicatPresa(date);

    await ctx.db.delete(fundraisingPressReleases).where(and(eq(fundraisingPressReleases.campaignPageId, pageId), eq(fundraisingPressReleases.status, "draft")));
    await ctx.db.insert(fundraisingPressReleases).values({ campaignPageId: pageId, orgId: ctx.orgId, continut, status: "draft" });

    return { error: null, ok: true, aiFolosit: Boolean(ai) };
  },
});

export const listComunicatCampanie = withOrgSession(listComunicatCampanieImpl);

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
export const listMediaContacteCampanie = withOrgSession(listMediaContacteCampanieImpl);

export const marcheazaOutreachAction = withOrgAdmin(async (ctx, releaseId: string, mediaContactId: string) => {
  await ctx.db.insert(fundraisingPressOutreachHistory).values({
    pressReleaseId: releaseId,
    mediaContactId,
    orgId: ctx.orgId,
  });
});

export const listOutreachIstoric = withOrgSession(listOutreachIstoricImpl);

// Grupuri locale recomandate pentru campanie — filtrate pe județul paginii.
export const listLocalGroupsCampanie = withOrgSession(listLocalGroupsCampanieImpl);

export const listGrupuriPublicateCampanie = withOrgSession(listGrupuriPublicateCampanieImpl);
