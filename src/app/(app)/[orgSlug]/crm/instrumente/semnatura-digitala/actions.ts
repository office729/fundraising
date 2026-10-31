"use server";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { mesajSigur } from "@/lib/erori";
import { statusDocument, tokenDocument, tokenValid, trimiteLaSemnat, type StatusDocument } from "@/lib/boldsign";
import { INSTRUMENTE_UI_DICT } from "@/lib/i18n/dictionaries/instrumente-ui";
import { getLocale } from "@/lib/i18n/get-locale";

export type TrimitereState = { ok: boolean; error: string | null; documentId?: string; titlu?: string; token?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BYTES = 10 * 1024 * 1024;

// Trimite un PDF la semnat prin BoldSign. Câmpuri așteptate în FormData:
// fisier (PDF), titlu, mesaj, semnatar_nume / semnatar_email (repetate).
// Doar owner/admin: documentele pleacă în numele organizației, din contul comun BoldSign.
export const trimiteDocumentLaSemnat = withOrgAdmin(async (ctx, formData: FormData): Promise<TrimitereState> => {
  const e_ = INSTRUMENTE_UI_DICT[await getLocale()].semnatura.erori;
  const fisier = formData.get("fisier");
  const titlu = String(formData.get("titlu") ?? "").trim();
  const mesaj = String(formData.get("mesaj") ?? "").trim();
  const nume = formData.getAll("semnatar_nume").map((v) => String(v).trim());
  const email = formData.getAll("semnatar_email").map((v) => String(v).trim());

  if (!(fisier instanceof File) || fisier.size === 0) return { ok: false, error: e_.alegePdf };
  if (fisier.type !== "application/pdf" && !fisier.name.toLowerCase().endsWith(".pdf")) return { ok: false, error: e_.doarPdf };
  if (fisier.size > MAX_BYTES) return { ok: false, error: e_.depaseste };
  const antet = new TextDecoder("latin1").decode(new Uint8Array(await fisier.slice(0, 5).arrayBuffer()));
  if (antet !== "%PDF-") return { ok: false, error: e_.pdfInvalid };
  if (!titlu) return { ok: false, error: e_.scrieTitlu };

  const semnatari = nume.map((n, i) => ({ nume: n, email: email[i] ?? "" })).filter((s) => s.nume || s.email);
  if (!semnatari.length) return { ok: false, error: e_.minUnSemnatar };
  if (semnatari.length > 10) return { ok: false, error: e_.maxSemnatari };
  if (semnatari.some((s) => !s.nume || !EMAIL.test(s.email))) return { ok: false, error: e_.semnatarInvalid };

  try {
    const { documentId } = await trimiteLaSemnat({ fisier, titlu, mesaj, semnatari });
    return { ok: true, error: null, documentId, titlu, token: tokenDocument(ctx.orgSlug, documentId) };
  } catch (e) {
    return { ok: false, error: mesajSigur(e, e_.trimitereEsuata, "boldsign-trimitere") };
  }
});

export const verificaStatusDocument = withOrgSession(
  async (ctx, documentId: string, token: string): Promise<{ ok: true; doc: StatusDocument } | { ok: false; error: string }> => {
    const e_ = INSTRUMENTE_UI_DICT[await getLocale()].semnatura.erori;
    if (!UUID.test(documentId) || !tokenValid(ctx.orgSlug, documentId, token ?? "")) {
      return { ok: false, error: e_.nuApartine };
    }
    try {
      return { ok: true, doc: await statusDocument(documentId) };
    } catch (e) {
      return { ok: false, error: mesajSigur(e, e_.statusEsuat, "boldsign-status") };
    }
  },
);
