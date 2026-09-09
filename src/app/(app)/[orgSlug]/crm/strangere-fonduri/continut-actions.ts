"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";

import { aiConfigurat, genereazaContinutCanalAI } from "@/lib/ai";
import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { fundraisingCalendarItems, fundraisingGeneratedContent, fundraisingPages } from "@/lib/db/schema";
import { genereazaCalendarZilnic, genereazaContinutPeCanal, type ContinutCanal, type DateCampanie } from "@/lib/promovare/generator";

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
  return {
    titlu: pagina.titlu,
    poveste: pagina.poveste,
    orgName,
    url,
    sumaStransa: pagina.sumaStransa,
    sumaTinta: pagina.sumaTinta,
  };
}

export type GenereazaState = { error: string | null; ok: boolean };

// Regenerează calendarul de 7 zile — șterge doar rândurile încă "de_facut"
// (nu atinge cele deja în lucru/publicate/finalizate, ca observațiile
// agentului să nu se piardă), apoi inserează un set nou din datele curente
// ale campaniei (sumă/procent/prag activ). Determinist, nu AI.
export const genereazaCalendarAction = withOrgAdmin(async (ctx, pageId: string): Promise<GenereazaState> => {
  const date = await dateCampanie(ctx.db, pageId, ctx.orgId, ctx.orgSlug, ctx.orgName);
  if (!date) return { error: "Pagina nu a fost găsită.", ok: false };

  await ctx.db
    .delete(fundraisingCalendarItems)
    .where(and(eq(fundraisingCalendarItems.campaignPageId, pageId), eq(fundraisingCalendarItems.status, "de_facut")));

  const items = genereazaCalendarZilnic(date);
  const azi = new Date();
  await ctx.db.insert(fundraisingCalendarItems).values(
    items.map((it, i) => {
      const ziua = new Date(azi);
      ziua.setDate(azi.getDate() + i);
      return {
        campaignPageId: pageId,
        orgId: ctx.orgId,
        ziua: ziua.toISOString().slice(0, 10),
        obiectiv: it.unghi,
        canalRecomandat: "Facebook / WhatsApp",
        textPregatit: it.text,
        status: "de_facut" as const,
      };
    }),
  );

  return { error: null, ok: true };
});

// Regenerează materialele pe canal — șterge doar rândurile "draft" (nu
// atinge cele deja aprobate/publicate).
export const genereazaContinutAction = withOrgAdmin(async (ctx, pageId: string): Promise<GenereazaState> => {
  const date = await dateCampanie(ctx.db, pageId, ctx.orgId, ctx.orgSlug, ctx.orgName);
  if (!date) return { error: "Pagina nu a fost găsită.", ok: false };

  await ctx.db
    .delete(fundraisingGeneratedContent)
    .where(and(eq(fundraisingGeneratedContent.campaignPageId, pageId), eq(fundraisingGeneratedContent.status, "draft")));

  const items = genereazaContinutPeCanal(date);
  await ctx.db.insert(fundraisingGeneratedContent).values(
    items.map((it) => ({
      campaignPageId: pageId,
      orgId: ctx.orgId,
      canal: it.canal,
      titlu: it.titlu,
      textComplet: it.textComplet,
      textScurt: it.textScurt,
      indemn: it.indemn,
      sursa: "sablon" as const,
      status: "draft" as const,
    })),
  );

  return { error: null, ok: true };
});

// Generează materialele pe canal CU AI (dacă ANTHROPIC_API_KEY e setat), cu
// fallback per canal la șablonul determinist când AI-ul nu e configurat sau
// eșuează. Șterge doar rândurile "draft" (nu atinge aprobat/publicat).
export const genereazaContinutAIAction = withOrgAdmin(
  async (ctx, pageId: string): Promise<GenereazaState & { aiFolosit?: boolean }> => {
    const date = await dateCampanie(ctx.db, pageId, ctx.orgId, ctx.orgSlug, ctx.orgName);
    if (!date) return { error: "Pagina nu a fost găsită.", ok: false };
    if (!aiConfigurat())
      return { error: "AI-ul nu e configurat (ANTHROPIC_API_KEY lipsește). Folosește «Generează (șablon)».", ok: false };

    const sablon = genereazaContinutPeCanal(date);
    const sablonDupaCanal = new Map<ContinutCanal["canal"], ContinutCanal>(sablon.map((s) => [s.canal, s]));

    // Generăm fiecare canal cu AI în paralel; per canal, fallback la șablon.
    const rezultate = await Promise.all(
      sablon.map(async (s) => {
        const ai = await genereazaContinutCanalAI(date, s.canal);
        return { item: ai ?? (sablonDupaCanal.get(s.canal) as ContinutCanal), aiFolosit: Boolean(ai) };
      }),
    );

    await ctx.db
      .delete(fundraisingGeneratedContent)
      .where(and(eq(fundraisingGeneratedContent.campaignPageId, pageId), eq(fundraisingGeneratedContent.status, "draft")));

    await ctx.db.insert(fundraisingGeneratedContent).values(
      rezultate.map(({ item, aiFolosit }) => ({
        campaignPageId: pageId,
        orgId: ctx.orgId,
        canal: item.canal,
        titlu: item.titlu,
        textComplet: item.textComplet,
        textScurt: item.textScurt,
        indemn: item.indemn,
        sursa: (aiFolosit ? "ai" : "sablon") as "ai" | "sablon",
        status: "draft" as const,
      })),
    );

    const aiFolosit = rezultate.some((r) => r.aiFolosit);
    return { error: null, ok: true, aiFolosit };
  },
);

// „Generează altă variantă" (secțiunea 5) — regenerează textul UNUI material cu
// AI, pe același canal. Doar materiale încă needitate uman (draft). Fallback:
// dacă AI-ul nu e disponibil, întoarce eroare (nu suprascrie cu șablon identic).
export const regenereazaVariantaContinutAction = withOrgAdmin(
  async (ctx, contentId: string): Promise<GenereazaState> => {
    const rows = await ctx.db
      .select()
      .from(fundraisingGeneratedContent)
      .where(and(eq(fundraisingGeneratedContent.id, contentId), eq(fundraisingGeneratedContent.orgId, ctx.orgId)))
      .limit(1);
    const cur = rows[0];
    if (!cur) return { error: "Materialul nu a fost găsit.", ok: false };
    if (cur.status !== "draft") return { error: "Doar materialele în stadiul «draft» pot fi regenerate.", ok: false };
    if (!aiConfigurat()) return { error: "AI-ul nu e configurat (ANTHROPIC_API_KEY lipsește).", ok: false };

    const date = await dateCampanie(ctx.db, cur.campaignPageId, ctx.orgId, ctx.orgSlug, ctx.orgName);
    if (!date) return { error: "Pagina nu a fost găsită.", ok: false };

    const ai = await genereazaContinutCanalAI(date, cur.canal, Math.floor(Math.random() * 1000));
    if (!ai) return { error: "AI-ul nu a putut genera o variantă. Încearcă din nou.", ok: false };

    await ctx.db
      .update(fundraisingGeneratedContent)
      .set({ titlu: ai.titlu, textComplet: ai.textComplet, textScurt: ai.textScurt, indemn: ai.indemn, sursa: "ai" })
      .where(and(eq(fundraisingGeneratedContent.id, contentId), eq(fundraisingGeneratedContent.orgId, ctx.orgId)));

    return { error: null, ok: true };
  },
);

export const listCalendarCampanie = withOrgSession(async (ctx, pageId: string) => {
  return ctx.db.select().from(fundraisingCalendarItems).where(eq(fundraisingCalendarItems.campaignPageId, pageId)).orderBy(fundraisingCalendarItems.ziua);
});

export const listContinutCampanie = withOrgSession(async (ctx, pageId: string) => {
  return ctx.db.select().from(fundraisingGeneratedContent).where(eq(fundraisingGeneratedContent.campaignPageId, pageId));
});

// Aprobă un material generat — vizibil doar după aprobare (status trece din
// 'draft' în 'aprobat'); beneficiarul vede doar materialele aprobate.
export const aprobaContinutAction = withOrgAdmin(async (ctx, contentId: string) => {
  await ctx.db
    .update(fundraisingGeneratedContent)
    .set({ status: "aprobat", aprobatDe: ctx.userId })
    .where(and(eq(fundraisingGeneratedContent.id, contentId), eq(fundraisingGeneratedContent.orgId, ctx.orgId)));
});

export const stergeContinutAction = withOrgAdmin(async (ctx, contentId: string) => {
  await ctx.db.delete(fundraisingGeneratedContent).where(and(eq(fundraisingGeneratedContent.id, contentId), eq(fundraisingGeneratedContent.orgId, ctx.orgId)));
});

export const stergeCalendarItemAction = withOrgAdmin(async (ctx, itemId: string) => {
  await ctx.db.delete(fundraisingCalendarItems).where(and(eq(fundraisingCalendarItems.id, itemId), eq(fundraisingCalendarItems.orgId, ctx.orgId)));
});

const CALENDAR_STATUSES = ["de_facut", "in_lucru", "publicat", "finalizat"] as const;
export const actualizeazaStatusCalendarAction = withOrgAdmin(
  async (ctx, itemId: string, status: (typeof CALENDAR_STATUSES)[number]) => {
    if (!CALENDAR_STATUSES.includes(status)) return;
    await ctx.db
      .update(fundraisingCalendarItems)
      .set({ status })
      .where(and(eq(fundraisingCalendarItems.id, itemId), eq(fundraisingCalendarItems.orgId, ctx.orgId)));
  },
);
