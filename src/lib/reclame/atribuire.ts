// Atribuirea unei donații: ultimul clic eligibil, nedirect, observat înainte de donație (model „ultim-clic-v1”). Funcții pure, fără importuri.
// Atribuirea e o regulă de asociere, nu o dovadă că reclama a produs donația. Traficul direct nu suprascrie un clic eligibil, iar un clic ulterior
// din email sau din social organic ia locul unei reclame mai vechi (contextul se înlocuiește la fiecare vizită cu parametri UTM).

export const MODEL_ATRIBUIRE = "ultim-clic-v1";
export const FEREASTRA_IMPLICITA_ZILE = 7;
export const FEREASTRA_MAXIMA_ZILE = 30; // peste această vechime un clic nu mai e luat în seamă, indiferent de fereastra aleasă în raport

export type Platforma = "meta" | "tiktok" | "linkedin" | "google" | "altele";
export const PLATFORME: { cheie: Platforma; eticheta: string }[] = [
  { cheie: "meta", eticheta: "Meta (Facebook și Instagram)" },
  { cheie: "tiktok", eticheta: "TikTok" },
  { cheie: "linkedin", eticheta: "LinkedIn" },
  { cheie: "google", eticheta: "Google Ads" },
  { cheie: "altele", eticheta: "Altă platformă" },
];
export const esteCheiePlatforma = (x: unknown): x is Platforma => typeof x === "string" && PLATFORME.some((p) => p.cheie === x);

export type ClasaTrafic = "platita" | "organica" | "email" | "alta";

// Cod/etichetă UTM acceptată: litere mici, cifre și . _ : - (fără spații, diacritice sau date personale), cel mult 60 de caractere.
export function curataCod(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_.:-]{0,59}$/.test(t) ? t : null;
}

const MEDIUMURI_PLATITE = new Set(["paid_social", "paid-social", "paidsocial", "paid", "cpc", "ppc", "cpm", "social_paid", "display", "paid_search"]);
const MEDIUMURI_EMAIL = new Set(["email", "e-mail", "newsletter"]);
const MEDIUMURI_ORGANICE = new Set(["organic_social", "organic-social", "social", "organic", "referral", "voluntari", "presa", "sms", "whatsapp"]);

export function clasaTrafic(medium: string | null): ClasaTrafic {
  const m = (medium ?? "").toLowerCase();
  if (MEDIUMURI_PLATITE.has(m)) return "platita";
  if (MEDIUMURI_EMAIL.has(m)) return "email";
  if (MEDIUMURI_ORGANICE.has(m)) return "organica";
  return "alta";
}

// Platforma reclamei, din utm_source (inclusiv valorile pe care le pune Meta în {{site_source_name}}: fb, ig, msg, an).
export function platformaDinSursa(source: string | null): Platforma {
  const s = (source ?? "").toLowerCase();
  if (["facebook", "fb", "instagram", "ig", "meta", "messenger", "msg", "an", "audience_network"].includes(s)) return "meta";
  if (["tiktok", "tt"].includes(s)) return "tiktok";
  if (["linkedin", "li"].includes(s)) return "linkedin";
  if (["google", "adwords", "googleads"].includes(s)) return "google";
  return "altele";
}

// Plasamentul din utm_source, când Meta îl completează ({{site_source_name}}: fb, ig, an, msg); gol dacă sursa nu îl spune.
export function plasamentDinSursa(source: string | null): string {
  const s = (source ?? "").toLowerCase();
  if (s === "fb" || s === "facebook") return "facebook";
  if (s === "ig" || s === "instagram") return "instagram";
  if (s === "an" || s === "audience_network") return "audience_network";
  if (s === "msg" || s === "messenger") return "messenger";
  return "";
}

export type Touch = {
  s: string; // utm_source
  m: string | null; // utm_medium
  c: string | null; // utm_campaign
  k: string | null; // utm_content
  t: number; // momentul clicului, ms
  st?: 1; // 1 = citit din stocarea locală (acord de statistici), altfel din adresa paginii
};

// Contextul din parametrii adresei; fără utm_source nu există un clic de atribuit.
export function touchDinParametri(get: (nume: string) => string | null, acumMs: number): Touch | null {
  const s = curataCod(get("utm_source"));
  if (!s) return null;
  return { s, m: curataCod(get("utm_medium")), c: curataCod(get("utm_campaign")), k: curataCod(get("utm_content")), t: acumMs };
}

// Validare pe server a ceea ce trimite browserul: nimic din client nu e de încredere (coduri curățate, timp plauzibil, clasa recalculată).
export function valideazaTouch(raw: unknown, acumMs: number): (Touch & { clasa: ClasaTrafic; platforma: Platforma | null }) | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const s = curataCod(r.s);
  if (!s) return null;
  const t = typeof r.t === "number" && Number.isFinite(r.t) ? Math.floor(r.t) : NaN;
  if (!Number.isFinite(t)) return null;
  if (t > acumMs + 5 * 60_000) return null; // din viitor (ceas greșit sau manipulare)
  if (acumMs - t > FEREASTRA_MAXIMA_ZILE * 86_400_000) return null;
  const m = curataCod(r.m);
  const clasa = clasaTrafic(m);
  return { s, m, c: curataCod(r.c), k: curataCod(r.k), t, ...(r.st === 1 ? { st: 1 as const } : {}), clasa, platforma: clasa === "platita" ? platformaDinSursa(s) : null };
}

// Donația intră în raportul pentru fereastra aleasă dacă între clic și donație au trecut cel mult atâtea zile.
export function inFereastra(clickLa: Date | null, donatieLa: Date, fereastraZile: number): boolean {
  if (!clickLa) return false;
  const diferenta = donatieLa.getTime() - clickLa.getTime();
  return diferenta >= -5 * 60_000 && diferenta <= fereastraZile * 86_400_000;
}
