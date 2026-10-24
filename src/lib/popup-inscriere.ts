// Pop-up-ul de înscriere al ONG-urilor de pe site-ul public: apare după lansare (26 octombrie 2026, 06:00, ora României) și după 20 de secunde de stat pe site.
// Fișier fără importuri, ca să se poată testa direct; momentul lansării e copiat din lib/prelansare.ts (un test verifică să fie același).

export const POPUP_START_MS = Date.parse("2026-10-26T06:00:00+02:00");
const LIVE_DE_LA_MS = POPUP_START_MS;

export const POPUP_PRAG_SECUNDE = 20;
// Prima vizită din sesiune (sessionStorage) și „nu mai arăta până la” (localStorage). Valorile sunt momente în milisecunde.
export const POPUP_CHEIE_PRIMA_VIZITA = "alx_pop_prima";
export const POPUP_CHEIE_ASCUNS_PANA = "alx_pop_ascuns";
export const POPUP_ZILE_ASCUNS_INCHIS = 14;
export const POPUP_ZILE_ASCUNS_TRIMIS = 365;

// Pagini pe care pop-up-ul nu apare: textele legale (se citesc în liniște) și paginile de autentificare/înscriere (au deja formularul lor).
const CAI_EXCLUSE = ["/cookies", "/gdpr", "/termeni", "/termeni-donatori", "/dpa", "/login", "/signup", "/forgot-password", "/prelansare"];

export function caleExclusa(cale: string): boolean {
  const c = cale.length > 1 ? cale.replace(/\/+$/, "") : cale;
  return CAI_EXCLUSE.some((x) => c === x || c.startsWith(`${x}/`));
}

// Peste câte milisecunde trebuie arătat pop-up-ul: 0 = acum, null = nu se arată (înainte de lansare, ascuns de vizitator sau pagină exclusă).
// Cele 20 de secunde se numără de la prima vizită din sesiune, dar nu înainte de lansare.
export function pesteCatArataPopup(p: { acum: number; primaVizita: number; ascunsPana: number; cale: string; previzualizare?: boolean }): number | null {
  if (p.previzualizare) return 0;
  if (caleExclusa(p.cale)) return null;
  if (p.acum < LIVE_DE_LA_MS) return null;
  if (p.ascunsPana > p.acum) return null;
  const start = Math.max(p.primaVizita, LIVE_DE_LA_MS);
  return Math.max(0, start + POPUP_PRAG_SECUNDE * 1000 - p.acum);
}

export type DateInteres = { nume: string; organizatie: string; email: string; telefon: string; acord: boolean };
export type CampInteres = keyof DateInteres;
export type EroriInteres = Partial<Record<CampInteres, string>>;

// Fără caractere care n-au ce căuta într-o adresă (< > , " ' ? & ; : parantezele, backslash): ele ar ajunge în antetul „Reply-To” și în linkul „mailto:” al echipei.
const RE_EMAIL = /^[^\s@<>,"'`?&;:()[\]\\]+@[^\s@<>,"'`?&;:()[\]\\]+\.[^\s@<>,"'`?&;:()[\]\\]{2,}$/;

// Validare comună clientului (mesaje imediate) și serverului (singura care contează). Întoarce datele curățate sau erorile pe câmpuri.
export function valideazaInteres(intrare: Partial<Record<CampInteres, unknown>>): { ok: true; date: DateInteres } | { ok: false; erori: EroriInteres } {
  const text = (v: unknown) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim() : "");
  const nume = text(intrare.nume);
  const organizatie = text(intrare.organizatie);
  const email = text(intrare.email).toLowerCase();
  const telefon = text(intrare.telefon);
  const erori: EroriInteres = {};
  if (nume.length < 2) erori.nume = "Scrie-ți numele.";
  else if (nume.length > 100) erori.nume = "Numele e prea lung.";
  if (organizatie.length < 2) erori.organizatie = "Scrie numele organizației.";
  else if (organizatie.length > 150) erori.organizatie = "Numele organizației e prea lung.";
  if (!email) erori.email = "Scrie adresa de e-mail.";
  else if (email.length > 254 || !RE_EMAIL.test(email)) erori.email = "Adresa de e-mail nu pare corectă.";
  if (telefon) {
    const cifre = telefon.replace(/\D/g, "");
    if (!/^[+\d\s().-]{6,30}$/.test(telefon) || cifre.length < 6 || cifre.length > 15) erori.telefon = "Numărul de telefon nu pare corect.";
  }
  if (intrare.acord !== true) erori.acord = "Bifează că ai citit Politica de confidențialitate.";
  if (Object.keys(erori).length > 0) return { ok: false, erori };
  return { ok: true, date: { nume, organizatie, email, telefon, acord: true } };
}

// Cheia limitei de cereri pe adresă IP: IPv4 așa cum e; IPv6 rotunjit la rețeaua /64 (o singură conexiune primește de obicei un /64 întreg, deci altfel
// ar avea miliarde de „adrese” diferite și limita n-ar mai opri nimic).
export function cheieIpPentruLimita(ip: string): string {
  const x = (ip ?? "").trim().toLowerCase();
  if (!x.includes(":")) return x || "necunoscut";
  const mapat = x.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapat) return mapat[1];
  const parti = x.split("::");
  if (parti.length > 2) return x;
  const stanga = parti[0] ? parti[0].split(":") : [];
  const dreapta = parti.length === 2 && parti[1] ? parti[1].split(":") : [];
  const lipsa = parti.length === 2 ? Math.max(0, 8 - stanga.length - dreapta.length) : 0;
  const hextete = [...stanga, ...Array(lipsa).fill("0"), ...dreapta];
  return hextete.slice(0, 4).map((h) => h.replace(/^0+(?=.)/, "") || "0").join(":") + "::/64";
}
