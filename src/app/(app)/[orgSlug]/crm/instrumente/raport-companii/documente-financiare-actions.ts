"use server";

import { randomUUID } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";

import { extrageDateFinanciareAI, type DateFinanciareExtrase } from "@/lib/ai";
import { withOrgAdmin } from "@/lib/auth/guard";
import { financialDocuments } from "@/lib/db/schema";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";
import { parseazaXlsxCaTextTabelar } from "@/lib/parse-balanta-xlsx";
import { createClient } from "@/lib/supabase/server";
import { valideazaDocumentFinanciar } from "@/lib/upload-documente-financiare";

const BUCKET = "org-financial-docs";

export type DocumentFinanciarRand = {
  id: string;
  an: number;
  tip: "balanta" | "bilant";
  fisierNume: string;
  incarcatLa: Date;
  dateExtrase: DateFinanciareExtrase | null;
  extractieStatus: "in_asteptare" | "ok" | "eroare";
  extractieEroare: string | null;
  confirmatLa: Date | null;
};

// Listă pentru UI — cele mai recente documente încărcate (orice an/tip),
// suficient pentru un istoric scurt; nu paginăm, volumul e mic (max 2/an).
export const listeazaDocumenteFinanciareAction = withOrgAdmin(async (ctx): Promise<DocumentFinanciarRand[]> => {
  const rows = await ctx.db
    .select({
      id: financialDocuments.id,
      an: financialDocuments.an,
      tip: financialDocuments.tip,
      fisierNume: financialDocuments.fisierNume,
      incarcatLa: financialDocuments.incarcatLa,
      dateExtrase: financialDocuments.dateExtrase,
      extractieStatus: financialDocuments.extractieStatus,
      extractieEroare: financialDocuments.extractieEroare,
      confirmatLa: financialDocuments.confirmatLa,
    })
    .from(financialDocuments)
    .orderBy(desc(financialDocuments.an), desc(financialDocuments.incarcatLa));
  return rows.map((r) => ({ ...r, dateExtrase: (r.dateExtrase as DateFinanciareExtrase | null) ?? null }));
});

// Încarcă Balanța/Bilanțul pentru un an — upsert pe (orgId, an, tip): un
// upload nou înlocuiește documentul anterior și îi resetează extracția/
// confirmarea (o cifră veche confirmată nu rămâne agățată de un fișier nou).
export const incarcaDocumentFinanciarAction = withOrgAdmin(
  async (ctx, params: { an: number; tip: "balanta" | "bilant"; fisier: File }) => {
    if (!Number.isInteger(params.an) || params.an < 2000 || params.an > 2100) {
      throw new EroareUtilizator("An invalid.");
    }
    const validare = await valideazaDocumentFinanciar(params.fisier);
    if (!validare.ok) throw new EroareUtilizator(validare.eroare);

    const ext = validare.format === "pdf" ? "pdf" : params.fisier.name.toLowerCase().endsWith(".xls") ? "xls" : "xlsx";
    const path = `${ctx.orgId}/${params.an}-${params.tip}-${randomUUID()}.${ext}`;
    const mimeType = params.fisier.type || (validare.format === "pdf" ? "application/pdf" : "application/octet-stream");

    const supabase = await createClient();
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, params.fisier, { contentType: mimeType, upsert: false });
    if (uploadError) throw new EroareUtilizator("Încărcarea fișierului a eșuat: " + uploadError.message);

    const valoriComune = {
      fisierPath: path,
      fisierNume: params.fisier.name,
      mimeType,
      marimeBytes: params.fisier.size,
      incarcatDe: ctx.userId,
      extractieStatus: "in_asteptare" as const,
      dateExtrase: null,
      extractieEroare: null,
      confirmatDe: null,
      confirmatLa: null,
    };
    await ctx.db
      .insert(financialDocuments)
      .values({ orgId: ctx.orgId, an: params.an, tip: params.tip, ...valoriComune })
      .onConflictDoUpdate({
        target: [financialDocuments.orgId, financialDocuments.an, financialDocuments.tip],
        set: { ...valoriComune, incarcatLa: new Date() },
      });
  },
);

// Rulează extragerea AI pentru documentul deja încărcat — citește fișierul
// înapoi din storage (privat, deci prin download server-side, nu URL public).
export const extrageDateFinanciareAction = withOrgAdmin(async (ctx, params: { an: number; tip: "balanta" | "bilant" }) => {
  const [doc] = await ctx.db
    .select()
    .from(financialDocuments)
    .where(and(eq(financialDocuments.orgId, ctx.orgId), eq(financialDocuments.an, params.an), eq(financialDocuments.tip, params.tip)))
    .limit(1);
  if (!doc) throw new EroareUtilizator("Documentul nu a fost găsit.");

  const supabase = await createClient();
  const { data: fisier, error: downloadError } = await supabase.storage.from(BUCKET).download(doc.fisierPath);
  if (downloadError || !fisier) {
    await ctx.db
      .update(financialDocuments)
      .set({ extractieStatus: "eroare", extractieEroare: "Fișierul nu a putut fi citit din storage." })
      .where(eq(financialDocuments.id, doc.id));
    throw new EroareUtilizator("Fișierul nu a putut fi citit din storage.");
  }

  const esteXlsx = doc.mimeType !== "application/pdf";
  try {
    const extras = esteXlsx
      ? await extrageDateFinanciareAI({ an: params.an, tip: params.tip, textTabelar: await parseazaXlsxCaTextTabelar(await fisier.arrayBuffer()) })
      : await extrageDateFinanciareAI({
          an: params.an,
          tip: params.tip,
          documentPdf: { mediaType: "application/pdf", base64: Buffer.from(await fisier.arrayBuffer()).toString("base64") },
        });

    if (!extras) {
      await ctx.db
        .update(financialDocuments)
        .set({ extractieStatus: "eroare", extractieEroare: "AI-ul nu a putut extrage cifre din document (sau nu e configurat)." })
        .where(eq(financialDocuments.id, doc.id));
      throw new EroareUtilizator("Extragerea a eșuat — completează cifrele manual.");
    }

    await ctx.db
      .update(financialDocuments)
      .set({ dateExtrase: extras, extractieStatus: "ok", extractieEroare: null })
      .where(eq(financialDocuments.id, doc.id));
  } catch (e) {
    if (e instanceof EroareUtilizator) throw e;
    const mesaj = mesajSigur(e, "Extragerea a eșuat.", "raport-companii-extractie");
    await ctx.db.update(financialDocuments).set({ extractieStatus: "eroare", extractieEroare: mesaj }).where(eq(financialDocuments.id, doc.id));
    throw new EroareUtilizator(mesaj);
  }
});

// Admin confirmă (opțional corectând) cifrele extrase — OBLIGATORIU înainte
// ca acest document să poată fi folosit ca sursă pentru un raport de
// activitate trimis unei companii (gardă anti-halucinație AI).
export const salveazaCorectiiFinanciareAction = withOrgAdmin(
  async (ctx, params: { an: number; tip: "balanta" | "bilant"; corectii: DateFinanciareExtrase }) => {
    const [doc] = await ctx.db
      .select({ id: financialDocuments.id })
      .from(financialDocuments)
      .where(and(eq(financialDocuments.orgId, ctx.orgId), eq(financialDocuments.an, params.an), eq(financialDocuments.tip, params.tip)))
      .limit(1);
    if (!doc) throw new EroareUtilizator("Documentul nu a fost găsit.");

    await ctx.db
      .update(financialDocuments)
      .set({ dateExtrase: params.corectii, confirmatDe: ctx.userId, confirmatLa: new Date() })
      .where(eq(financialDocuments.id, doc.id));
  },
);
