"use server";

import { randomUUID } from "node:crypto";

import { and, asc, eq, inArray } from "drizzle-orm";
import { headers } from "next/headers";

import { aiConfigurat, genereazaTextMultumireAI } from "@/lib/ai";
import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { fundraisingBeneficiaries, fundraisingPages, fundraisingTaskAttachments, fundraisingTasks } from "@/lib/db/schema";
import { notifica } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

export type CreeazaTaskState = { error: string | null; ok: boolean };

const TIPURI = ["generala", "sponsorizare"] as const;

// Sarcină pentru beneficiar — generală sau de sponsorizare (secțiunea 9:
// text de mulțumire, canal recomandat, atașamente). Un singur tabel,
// discriminat pe `tip` (vezi schema) — evită duplicarea structurii.
// Notifică beneficiarul (in-app + email best-effort) la creare.
export const creeazaTaskAction = withOrgAdmin(
  async (ctx, pageId: string, _prevState: CreeazaTaskState, formData: FormData): Promise<CreeazaTaskState> => {
    const tip = String(formData.get("tip") ?? "generala");
    const titlu = String(formData.get("titlu") ?? "").trim();
    const descriere = String(formData.get("descriere") ?? "").trim() || null;
    const dataLimitaRaw = String(formData.get("dataLimita") ?? "").trim();
    if (!TIPURI.includes(tip as (typeof TIPURI)[number])) return { error: "Tip de sarcină invalid.", ok: false };
    if (!titlu) return { error: "Titlul sarcinii este obligatoriu.", ok: false };

    const companie = tip === "sponsorizare" ? String(formData.get("companie") ?? "").trim() || null : null;
    const sumaRaw = String(formData.get("suma") ?? "").trim();
    const suma = tip === "sponsorizare" && sumaRaw ? Math.round(Number(sumaRaw)) : null;
    const textMultumire = tip === "sponsorizare" ? String(formData.get("textMultumire") ?? "").trim() || null : null;
    const canalRecomandat = tip === "sponsorizare" ? String(formData.get("canalRecomandat") ?? "").trim() || null : null;

    const pagina = await ctx.db
      .select({ id: fundraisingPages.id })
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.id, pageId), eq(fundraisingPages.orgId, ctx.orgId)))
      .limit(1);
    if (!pagina[0]) return { error: "Pagina nu a fost găsită.", ok: false };

    await ctx.db
      .insert(fundraisingTasks)
      .values({
        campaignPageId: pageId,
        orgId: ctx.orgId,
        tip: tip as (typeof TIPURI)[number],
        titlu,
        descriere,
        dataLimita: dataLimitaRaw || null,
        companie,
        suma,
        moneda: suma ? "RON" : null,
        textMultumire,
        canalRecomandat,
        createdBy: ctx.userId,
      })
      .returning({ id: fundraisingTasks.id });

    const beneficiar = await ctx.db
      .select({ id: fundraisingBeneficiaries.id, appUserId: fundraisingBeneficiaries.appUserId, email: fundraisingBeneficiaries.email })
      .from(fundraisingBeneficiaries)
      .where(and(eq(fundraisingBeneficiaries.campaignPageId, pageId), eq(fundraisingBeneficiaries.status, "activ")))
      .limit(1);
    if (beneficiar[0]) {
      const hdrs = await headers();
      const proto = hdrs.get("x-forwarded-proto") ?? "https";
      const link = `${proto}://${hdrs.get("host")}/beneficiar/sarcinile-mele`;
      await notifica(ctx.db, {
        appUserId: beneficiar[0].appUserId,
        tip: "task_nou",
        titlu: tip === "sponsorizare" ? "Sarcină nouă de sponsorizare" : "Sarcină nouă",
        continut: titlu,
        link,
        email: beneficiar[0].email,
      });
    }

    return { error: null, ok: true };
  },
);

// Generează cu AI textul de mulțumire pentru o sarcină de sponsorizare
// (secțiunea 9). Întoarce textul; clientul îl pune în câmpul din formular ca
// să poată fi editat înainte de salvare. Fără cheie AI → error clar.
export const genereazaTextMultumireAIAction = withOrgAdmin(
  async (
    ctx,
    pageId: string,
    companie: string,
    suma: number | null,
    moneda: string | null,
  ): Promise<{ error: string | null; text: string | null }> => {
    if (!aiConfigurat()) return { error: "AI-ul nu e configurat (ANTHROPIC_API_KEY lipsește).", text: null };
    if (!companie.trim()) return { error: "Completează numele companiei mai întâi.", text: null };

    const rows = await ctx.db
      .select()
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.id, pageId), eq(fundraisingPages.orgId, ctx.orgId)))
      .limit(1);
    const pagina = rows[0];
    if (!pagina) return { error: "Pagina nu a fost găsită.", text: null };

    const hdrs = await headers();
    const proto = hdrs.get("x-forwarded-proto") ?? "https";
    const url = `${proto}://${hdrs.get("host")}/strangere-fonduri/${ctx.orgSlug}/${pagina.slug}`;
    const text = await genereazaTextMultumireAI(
      { titlu: pagina.titlu, poveste: pagina.poveste, orgName: ctx.orgName, url, sumaStransa: pagina.sumaStransa, sumaTinta: pagina.sumaTinta },
      companie.trim(),
      suma,
      moneda,
    );
    if (!text) return { error: "AI-ul nu a putut genera textul. Încearcă din nou.", text: null };
    return { error: null, text };
  },
);

export const listTaskuriCampanie = withOrgSession(async (ctx, pageId: string) => {
  return ctx.db.select().from(fundraisingTasks).where(eq(fundraisingTasks.campaignPageId, pageId)).orderBy(asc(fundraisingTasks.dataLimita));
});

export const stergeTaskAction = withOrgAdmin(async (ctx, taskId: string) => {
  await ctx.db.delete(fundraisingTasks).where(and(eq(fundraisingTasks.id, taskId), eq(fundraisingTasks.orgId, ctx.orgId)));
});

export const finalizeazaTaskAdminAction = withOrgAdmin(async (ctx, taskId: string) => {
  await ctx.db
    .update(fundraisingTasks)
    .set({ status: "finalizata", completedAt: new Date() })
    .where(and(eq(fundraisingTasks.id, taskId), eq(fundraisingTasks.orgId, ctx.orgId)));
});

export type AdaugaAttachmentState = { error: string | null; ok: boolean };

export const adaugaAttachmentAction = withOrgAdmin(
  async (ctx, taskId: string, _prevState: AdaugaAttachmentState, formData: FormData): Promise<AdaugaAttachmentState> => {
    const fisier = formData.get("fisier");
    if (!(fisier instanceof File) || fisier.size === 0) return { error: "Alege un fișier.", ok: false };
    if (fisier.size > 10 * 1024 * 1024) return { error: "Fișierul e prea mare (max 10MB).", ok: false };
    // Bucket-ul de storage actual (org-branding) acceptă doar imagini.
    if (!fisier.type.startsWith("image/")) {
      return { error: "Doar imagini (jpg, png, webp) pot fi atașate momentan.", ok: false };
    }

    const task = await ctx.db.select({ id: fundraisingTasks.id }).from(fundraisingTasks).where(and(eq(fundraisingTasks.id, taskId), eq(fundraisingTasks.orgId, ctx.orgId))).limit(1);
    if (!task[0]) return { error: "Sarcina nu a fost găsită.", ok: false };

    const supabase = await createClient();
    const ext = fisier.name.split(".").pop() || "bin";
    const path = `${ctx.orgSlug}/taskuri/${taskId}-${randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("org-branding").upload(path, fisier, {
      contentType: fisier.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) return { error: "Încărcarea fișierului a eșuat: " + uploadError.message, ok: false };
    const fisierUrl = supabase.storage.from("org-branding").getPublicUrl(path).data.publicUrl;

    await ctx.db.insert(fundraisingTaskAttachments).values({ taskId, orgId: ctx.orgId, fisierUrl, denumire: fisier.name });
    return { error: null, ok: true };
  },
);

export const listAttachmentsTask = withOrgSession(async (ctx, taskId: string) => {
  return ctx.db.select().from(fundraisingTaskAttachments).where(eq(fundraisingTaskAttachments.taskId, taskId));
});

export const listAttachmentsCampanie = withOrgSession(async (ctx, pageId: string) => {
  const taskuri = await ctx.db.select({ id: fundraisingTasks.id }).from(fundraisingTasks).where(eq(fundraisingTasks.campaignPageId, pageId));
  const taskIds = taskuri.map((t) => t.id);
  if (!taskIds.length) return [];
  return ctx.db.select().from(fundraisingTaskAttachments).where(inArray(fundraisingTaskAttachments.taskId, taskIds));
});
