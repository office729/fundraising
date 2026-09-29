import "server-only";

// Validare fișier pentru Balanța/Bilanțul încărcate în modulul „Raport de
// activitate companii" — pattern reutilizat din setari/actions.ts
// (updateBrandingAction, limită mărime + allowlist tip) și din
// semnatura-digitala/actions.ts (verificare magic-byte pentru PDF).

export const MAX_BYTES_DOCUMENT_FINANCIAR = 10 * 1024 * 1024; // 10MB

const MIME_XLSX = [
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
];

export type FormatDocumentFinanciar = "pdf" | "xlsx";

// Întoarce formatul detectat sau null (fișier respins) — verifică atât
// MIME-type cât și extensia (unele browsere trimit MIME generic pentru xlsx).
export function detecteazaFormat(fisier: File): FormatDocumentFinanciar | null {
  const nume = fisier.name.toLowerCase();
  if (fisier.type === "application/pdf" || nume.endsWith(".pdf")) return "pdf";
  if (MIME_XLSX.includes(fisier.type) || nume.endsWith(".xlsx") || nume.endsWith(".xls")) return "xlsx";
  return null;
}

// Verificare magic-byte pentru PDF — un fișier redenumit ".pdf" care nu e de
// fapt PDF nu trece mai departe către AI ca document atașat.
export async function esteHeaderPdfValid(fisier: File): Promise<boolean> {
  const antet = new TextDecoder("latin1").decode(new Uint8Array(await fisier.slice(0, 5).arrayBuffer()));
  return antet === "%PDF-";
}

export async function valideazaDocumentFinanciar(fisier: File): Promise<{ ok: true; format: FormatDocumentFinanciar } | { ok: false; eroare: string }> {
  if (fisier.size === 0) return { ok: false, eroare: "Fișierul e gol." };
  if (fisier.size > MAX_BYTES_DOCUMENT_FINANCIAR) return { ok: false, eroare: "Fișierul depășește 10 MB." };
  const format = detecteazaFormat(fisier);
  if (!format) return { ok: false, eroare: "Format neacceptat — încarcă un fișier PDF sau Excel (.xlsx/.xls)." };
  if (format === "pdf" && !(await esteHeaderPdfValid(fisier))) {
    return { ok: false, eroare: "Fișierul nu este un PDF valid." };
  }
  return { ok: true, format };
}
