"use server";

import { randomUUID } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { inregistreazaAudit } from "@/lib/audit";
import { fundraisingInvoices, fundraisingPages } from "@/lib/db/schema";
import { createClient } from "@/lib/supabase/server";

export type IncarcaFacturaState = { error: string | null; ok: boolean };

const CATEGORII = ["factura", "plata", "chitanta", "proforma"] as const;
const STATUSURI = ["achitata", "in_asteptare"] as const;

// Documentele financiare (facturi/ordine de plată/chitanțe/proforme) sunt
// sursa reală pentru „facturi achitate" din calculul dashboard-ului
// beneficiarului — nicio a doua sursă de adevăr pentru sume (vezi planul).
// Încărcate doar de admin/agent (withOrgAdmin), beneficiarul e strict
// view/download (RLS: fundraising_invoices_beneficiar_select — doar SELECT).
export const incarcaFacturaAction = withOrgAdmin(
  async (ctx, pageId: string, _prevState: IncarcaFacturaState, formData: FormData): Promise<IncarcaFacturaState> => {
    const denumire = String(formData.get("denumire") ?? "").trim();
    const sumaRaw = String(formData.get("suma") ?? "").trim();
    const categorie = String(formData.get("categorie") ?? "");
    const status = String(formData.get("status") ?? "in_asteptare");
    const fisier = formData.get("fisier");

    if (!denumire) return { error: "Denumirea documentului este obligatorie.", ok: false };
    const suma = Math.round(Number(sumaRaw));
    if (!Number.isFinite(suma) || suma <= 0) return { error: "Suma trebuie să fie un număr pozitiv.", ok: false };
    if (!CATEGORII.includes(categorie as (typeof CATEGORII)[number])) return { error: "Categorie invalidă.", ok: false };
    if (!STATUSURI.includes(status as (typeof STATUSURI)[number])) return { error: "Status invalid.", ok: false };
    if (!(fisier instanceof File) || fisier.size === 0) return { error: "Alege un fișier.", ok: false };
    if (fisier.size > 10 * 1024 * 1024) return { error: "Fișierul e prea mare (max 10MB).", ok: false };
    // Bucket-ul de storage actual (org-branding) acceptă doar imagini — vezi
    // nota din facturi-card.tsx. Fotografiază documentul dacă e pe hârtie.
    if (!fisier.type.startsWith("image/")) {
      return { error: "Doar imagini (jpg, png, webp) — fotografiază documentul dacă e pe hârtie sau PDF.", ok: false };
    }

    const pagina = await ctx.db
      .select({ id: fundraisingPages.id })
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.id, pageId), eq(fundraisingPages.orgId, ctx.orgId)))
      .limit(1);
    if (!pagina[0]) return { error: "Pagina nu a fost găsită.", ok: false };

    const supabase = await createClient();
    const ext = fisier.name.split(".").pop() || "pdf";
    const path = `${ctx.orgSlug}/facturi/${pageId}-${randomUUID()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("org-branding").upload(path, fisier, {
      contentType: fisier.type || "application/octet-stream",
      upsert: false,
    });
    if (uploadError) return { error: "Încărcarea fișierului a eșuat: " + uploadError.message, ok: false };
    const fisierUrl = supabase.storage.from("org-branding").getPublicUrl(path).data.publicUrl;

    const [inserat] = await ctx.db
      .insert(fundraisingInvoices)
      .values({
        campaignPageId: pageId,
        orgId: ctx.orgId,
        denumire,
        suma,
        data: new Date().toISOString().slice(0, 10),
        categorie: categorie as (typeof CATEGORII)[number],
        status: status as (typeof STATUSURI)[number],
        fisierUrl,
        incarcatDe: ctx.userId,
      })
      .returning({ id: fundraisingInvoices.id });

    await inregistreazaAudit(ctx.db, {
      orgId: ctx.orgId,
      actorAppUserId: ctx.userId,
      actiune: "factura_incarcata",
      entitate: "fundraising_invoices",
      entitateId: inserat.id,
      detalii: { denumire, suma, categorie, pageId },
    });

    return { error: null, ok: true };
  },
);

export const listFacturiCampanie = withOrgSession(async (ctx, pageId: string) => {
  return ctx.db.select().from(fundraisingInvoices).where(eq(fundraisingInvoices.campaignPageId, pageId)).orderBy(desc(fundraisingInvoices.createdAt));
});

export const actualizeazaStatusFacturaAction = withOrgAdmin(async (ctx, invoiceId: string, status: (typeof STATUSURI)[number]) => {
  if (!STATUSURI.includes(status)) return;
  await ctx.db
    .update(fundraisingInvoices)
    .set({ status })
    .where(and(eq(fundraisingInvoices.id, invoiceId), eq(fundraisingInvoices.orgId, ctx.orgId)));
});

export const stergeFacturaAction = withOrgAdmin(async (ctx, invoiceId: string) => {
  await inregistreazaAudit(ctx.db, {
    orgId: ctx.orgId,
    actorAppUserId: ctx.userId,
    actiune: "factura_stearsa",
    entitate: "fundraising_invoices",
    entitateId: invoiceId,
  });
  await ctx.db.delete(fundraisingInvoices).where(and(eq(fundraisingInvoices.id, invoiceId), eq(fundraisingInvoices.orgId, ctx.orgId)));
});
