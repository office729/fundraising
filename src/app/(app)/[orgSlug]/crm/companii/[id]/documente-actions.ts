"use server";

import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { companies } from "@/lib/db/schema";
import { BUCKET_PRIVAT, caleDinReferinta, referintaPrivata, stergeFisierePrivate } from "@/lib/fisiere-private";
import { createClient } from "@/lib/supabase/server";

import type { ActionState } from "../actions";

// Documentele unei firme (contracte, rapoarte, corespondență). Fișierele stau în bucket-ul privat (URL semnat la afișare),
// iar lista lor în companies.extra.documente — fără migrare.
export type DocumentFirma = { id: string; nume: string; ref: string; tip: string; marime: number; la: string; deNume: string | null };

// Allowlist explicit: extensia de stocare vine din tipul MIME verificat aici, niciodată din numele trimis de client.
const TIPURI: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
};
const MAX_BYTES = 10 * 1024 * 1024;

async function citesteDocumente(ctx: Parameters<Parameters<typeof withOrgSession>[0]>[0], companyId: string): Promise<DocumentFirma[] | null> {
  const [r] = await ctx.db.select({ extra: companies.extra }).from(companies).where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId))).limit(1);
  if (!r) return null;
  const d = ((r.extra ?? {}) as { documente?: DocumentFirma[] }).documente;
  return Array.isArray(d) ? d : [];
}

async function scrieDocumente(ctx: Parameters<Parameters<typeof withOrgSession>[0]>[0], companyId: string, documente: DocumentFirma[]) {
  await ctx.db
    .update(companies)
    .set({ extra: sql`coalesce(${companies.extra}, '{}'::jsonb) || ${JSON.stringify({ documente })}::text::jsonb`, updatedBy: ctx.userId })
    .where(and(eq(companies.id, companyId), eq(companies.orgId, ctx.orgId)));
}

export const incarcaDocumentFirma = withOrgSession(async (ctx, companyId: string, formData: FormData): Promise<ActionState> => {
  const fisier = formData.get("fisier");
  if (!(fisier instanceof File) || fisier.size === 0) return { error: "Alege un fișier." };
  if (fisier.size > MAX_BYTES) return { error: "Fișierul e prea mare (max 10 MB)." };
  const ext = TIPURI[fisier.type];
  if (!ext) return { error: "Tip de fișier neacceptat. Folosește PDF, imagine (jpg/png/webp), Word, Excel sau text." };

  const documente = await citesteDocumente(ctx, companyId);
  if (!documente) return { error: "Firma nu a fost găsită." };
  if (documente.length >= 100) return { error: "Ai atins limita de 100 de documente pe firmă." };

  const id = randomUUID();
  const cale = `${ctx.orgSlug}/companii/${companyId}/${id}.${ext}`;
  const supabase = await createClient();
  const { error: uploadError } = await supabase.storage.from(BUCKET_PRIVAT).upload(cale, fisier, { contentType: fisier.type, upsert: false });
  if (uploadError) return { error: "Încărcarea a eșuat: " + uploadError.message };

  const nume = (String(formData.get("nume") ?? "").trim() || fisier.name || `document.${ext}`).slice(0, 200);
  await scrieDocumente(ctx, companyId, [{ id, nume, ref: referintaPrivata(cale), tip: ext, marime: fisier.size, la: new Date().toISOString(), deNume: ctx.userName ?? null }, ...documente]);
  return { error: null };
});

export const stergeDocumentFirma = withOrgSession(async (ctx, companyId: string, documentId: string): Promise<ActionState> => {
  const documente = await citesteDocumente(ctx, companyId);
  if (!documente) return { error: "Firma nu a fost găsită." };
  const doc = documente.find((d) => d.id === documentId);
  if (!doc) return { error: null };
  // Doar căi din folderul acestei firme, în bucket-ul privat.
  if (caleDinReferinta(doc.ref)?.startsWith(`${ctx.orgSlug}/companii/${companyId}/`)) await stergeFisierePrivate(ctx.orgSlug, [doc.ref]);
  await scrieDocumente(ctx, companyId, documente.filter((d) => d.id !== documentId));
  return { error: null };
});
