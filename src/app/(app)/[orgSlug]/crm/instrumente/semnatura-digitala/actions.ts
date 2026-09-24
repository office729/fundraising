"use server";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { mesajSigur } from "@/lib/erori";
import { statusDocument, tokenDocument, tokenValid, trimiteLaSemnat, type StatusDocument } from "@/lib/boldsign";

export type TrimitereState = { ok: boolean; error: string | null; documentId?: string; titlu?: string; token?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BYTES = 10 * 1024 * 1024;

// Trimite un PDF la semnat prin BoldSign. Câmpuri așteptate în FormData:
// fisier (PDF), titlu, mesaj, semnatar_nume / semnatar_email (repetate).
// Doar owner/admin: documentele pleacă în numele organizației, din contul comun BoldSign.
export const trimiteDocumentLaSemnat = withOrgAdmin(async (ctx, formData: FormData): Promise<TrimitereState> => {
  const fisier = formData.get("fisier");
  const titlu = String(formData.get("titlu") ?? "").trim();
  const mesaj = String(formData.get("mesaj") ?? "").trim();
  const nume = formData.getAll("semnatar_nume").map((v) => String(v).trim());
  const email = formData.getAll("semnatar_email").map((v) => String(v).trim());

  if (!(fisier instanceof File) || fisier.size === 0) return { ok: false, error: "Alege un fișier PDF." };
  if (fisier.type !== "application/pdf" && !fisier.name.toLowerCase().endsWith(".pdf")) return { ok: false, error: "Momentan acceptăm doar fișiere PDF." };
  if (fisier.size > MAX_BYTES) return { ok: false, error: "Fișierul depășește 10 MB." };
  const antet = new TextDecoder("latin1").decode(new Uint8Array(await fisier.slice(0, 5).arrayBuffer()));
  if (antet !== "%PDF-") return { ok: false, error: "Fișierul nu este un PDF valid." };
  if (!titlu) return { ok: false, error: "Scrie un titlu pentru document." };

  const semnatari = nume.map((n, i) => ({ nume: n, email: email[i] ?? "" })).filter((s) => s.nume || s.email);
  if (!semnatari.length) return { ok: false, error: "Adaugă cel puțin un semnatar." };
  if (semnatari.length > 10) return { ok: false, error: "Cel mult 10 semnatari per document." };
  if (semnatari.some((s) => !s.nume || !EMAIL.test(s.email))) return { ok: false, error: "Fiecare semnatar are nevoie de nume și de un email valid." };

  try {
    const { documentId } = await trimiteLaSemnat({ fisier, titlu, mesaj, semnatari });
    return { ok: true, error: null, documentId, titlu, token: tokenDocument(ctx.orgSlug, documentId) };
  } catch (e) {
    return { ok: false, error: mesajSigur(e, "Trimiterea a eșuat.", "boldsign-trimitere") };
  }
});

export const verificaStatusDocument = withOrgSession(
  async (ctx, documentId: string, token: string): Promise<{ ok: true; doc: StatusDocument } | { ok: false; error: string }> => {
    if (!UUID.test(documentId) || !tokenValid(ctx.orgSlug, documentId, token ?? "")) {
      return { ok: false, error: "Documentul nu aparține acestei organizații." };
    }
    try {
      return { ok: true, doc: await statusDocument(documentId) };
    } catch (e) {
      return { ok: false, error: mesajSigur(e, "Nu am putut citi statusul.", "boldsign-status") };
    }
  },
);
