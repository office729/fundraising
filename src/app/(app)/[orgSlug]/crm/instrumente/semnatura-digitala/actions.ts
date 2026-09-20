"use server";

import { withOrgSession } from "@/lib/auth/guard";
import { statusDocument, trimiteLaSemnat, type StatusDocument } from "@/lib/boldsign";

export type TrimitereState = { ok: boolean; error: string | null; documentId?: string; titlu?: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BYTES = 10 * 1024 * 1024;

// Trimite un PDF la semnat prin BoldSign. Câmpuri așteptate în FormData:
// fisier (PDF), titlu, mesaj, semnatar_nume / semnatar_email (repetate).
export const trimiteDocumentLaSemnat = withOrgSession(async (_ctx, formData: FormData): Promise<TrimitereState> => {
  const fisier = formData.get("fisier");
  const titlu = String(formData.get("titlu") ?? "").trim();
  const mesaj = String(formData.get("mesaj") ?? "").trim();
  const nume = formData.getAll("semnatar_nume").map((v) => String(v).trim());
  const email = formData.getAll("semnatar_email").map((v) => String(v).trim());

  if (!(fisier instanceof File) || fisier.size === 0) return { ok: false, error: "Alege un fișier PDF." };
  if (fisier.type !== "application/pdf" && !fisier.name.toLowerCase().endsWith(".pdf")) return { ok: false, error: "Momentan acceptăm doar fișiere PDF." };
  if (fisier.size > MAX_BYTES) return { ok: false, error: "Fișierul depășește 10 MB." };
  if (!titlu) return { ok: false, error: "Scrie un titlu pentru document." };

  const semnatari = nume.map((n, i) => ({ nume: n, email: email[i] ?? "" })).filter((s) => s.nume || s.email);
  if (!semnatari.length) return { ok: false, error: "Adaugă cel puțin un semnatar." };
  if (semnatari.length > 10) return { ok: false, error: "Cel mult 10 semnatari per document." };
  if (semnatari.some((s) => !s.nume || !EMAIL.test(s.email))) return { ok: false, error: "Fiecare semnatar are nevoie de nume și de un email valid." };

  try {
    const { documentId } = await trimiteLaSemnat({ fisier, titlu, mesaj, semnatari });
    return { ok: true, error: null, documentId, titlu };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Trimiterea a eșuat." };
  }
});

export const verificaStatusDocument = withOrgSession(
  async (_ctx, documentId: string): Promise<{ ok: true; doc: StatusDocument } | { ok: false; error: string }> => {
    try {
      return { ok: true, doc: await statusDocument(documentId) };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Nu am putut citi statusul." };
    }
  },
);
