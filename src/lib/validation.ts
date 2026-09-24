export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValid(email: string): boolean {
  return EMAIL_RE.test(email);
}

// Normalizare pentru comparații/chei unice (ex. donatori_reali.email) —
// "Ion@Test.com" și "ion@test.com" trebuie să fie aceeași persoană. NU pentru
// afișare (păstrează capitalizarea originală acolo unde e doar text afișat).
export function normalizeazaEmail(email: string): string {
  return email.trim().toLowerCase();
}

// URL introdus de utilizator care ajunge într-un href (linkuri de grupuri,
// site/LinkedIn/Facebook ale firmelor, website de redacții). Doar http(s):
// un `javascript:alert(1)` sau `data:text/html,...` stocat aici s-ar executa pe
// domeniul aplicației la primul click al altui utilizator (inclusiv beneficiari).
// Fără schemă ("www.site.ro") se completează cu https://. Întoarce null dacă nu
// e un URL web valid.
export function urlWebSigur(brut: string | null | undefined): string | null {
  const v = (brut ?? "").trim();
  if (!v) return null;
  let u: URL | null = null;
  try {
    u = new URL(v);
  } catch {
    u = null;
  }
  if (u && (u.protocol === "http:" || u.protocol === "https:")) return u.toString();
  // Parsat cu altă schemă: javascript:, data:, mailto:... → respins, în afară de
  // "site.ro:8080" (host:port pe care URL îl ia drept schemă).
  if (u && !/^[a-z0-9.-]+:[0-9]+/i.test(v)) return null;
  try {
    const h = new URL("https://" + v);
    return h.hostname.includes(".") ? h.toString() : null;
  } catch {
    return null;
  }
}
