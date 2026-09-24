// Allowlist unică pentru imaginile încărcate în bucket-ul public "org-branding"
// (logo, copertă de campanie, facturi, atașamente de sarcini). Extensia se
// deduce DIN tipul acceptat, niciodată din numele fișierului trimis de client.
// Exclude SVG intenționat: poate conține <script>/handlere de evenimente, iar
// fișierul e servit public de pe domeniul Supabase (XSS stocat / phishing dacă
// e deschis direct, nu doar randat printr-un <img>).
export const IMAGINE_MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export function extensieImagine(mime: string): string | null {
  return IMAGINE_MIME_EXT[mime] ?? null;
}
