// Profilul AI al unei firme (cercetare pe web): a sponsorizat ONG-uri? ce mecanism preferă? plus „pregătirea de apel” (de ce ar sponsoriza, unghiul de abordare, cui scrii).
// Modul pur, fără importuri: curăță și VALIDEAZĂ răspunsul modelului, ca ce ajunge în CRM (și în scor) să fie verificabil.
//
// Gardă principală: o afirmație „da” (a sponsorizat / face sponsorizări) se păstrează doar dacă are cel puțin un exemplu cu link care a apărut într-un rezultat REAL al căutării web.
// Fără o astfel de dovadă, „da” devine „necunoscut”; modelul nu poate propune un link inventat și nu poate schimba scorul fără sursă.

export type Tri = "da" | "nu" | "necunoscut";
export type Preferinta = "d177" | "directa" | "ambele" | "necunoscut";
export type Incredere = "mare" | "medie" | "mica";

export type ExempluSponsorizare = { ong: string; an: string | null; detaliu: string; url: string };
export type SursaWeb = { titlu: string; url: string };

export type ProfilFirma = {
  aSponsorizatOng: Tri;
  faceSponsorizari: Tri;
  preferinta: Preferinta;
  domenii: string[];
  exemple: ExempluSponsorizare[];
  rezumat: string;
  recomandare: string;
  pregatireApel: { deCe: string; unghi: string; cuiScriem: string };
  incredere: Incredere;
  surse: SursaWeb[];
  la: string; // ISO
};

const LIM = { rezumat: 1200, recomandare: 600, deCe: 500, unghi: 500, cuiScriem: 200, domeniu: 60, detaliu: 240, ong: 120 };
const MAX = { domenii: 8, exemple: 6, surse: 12 };

const tri = (x: unknown): Tri => (x === "da" || x === "nu" ? x : "necunoscut");
const pref = (x: unknown): Preferinta => (x === "d177" || x === "directa" || x === "ambele" ? x : "necunoscut");
const incr = (x: unknown): Incredere => (x === "mare" || x === "medie" ? x : "mica");
const txt = (x: unknown, max: number): string => (typeof x === "string" ? x.replace(/\s+/g, " ").trim().slice(0, max) : "");

// Adresa adusă la o formă comparabilă (fără protocol, www, parametri sau „/” final), ca să se poată verifica dacă a apărut în căutare.
export function urlComparabil(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return null;
  }
}

// JSON-ul din răspunsul modelului: între prima „{” și ultima „}”, după ce se scot eventualele ``` de cod.
export function extrageJson(text: string): unknown | null {
  const t = text.replace(/```(?:json)?/gi, "");
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(t.slice(a, b + 1));
  } catch {
    return null;
  }
}

// Profilul curățat. `surse` = rezultatele reale ale căutării web (titlu + link). Intoarce null când răspunsul nu e un JSON utilizabil.
export function parseazaProfilFirma(text: string, surse: readonly SursaWeb[], acum: Date = new Date()): ProfilFirma | null {
  const brut = extrageJson(text) as Record<string, unknown> | null;
  if (!brut || typeof brut !== "object") return null;

  const reale = new Map<string, SursaWeb>();
  for (const s of surse) {
    const k = urlComparabil(s.url);
    if (k && !reale.has(k)) reale.set(k, { titlu: txt(s.titlu, 160), url: s.url });
  }

  // Exemplele rămân doar cu link din căutare (modelul nu poate inventa surse); adresa se înlocuiește cu cea reală.
  const exemple: ExempluSponsorizare[] = [];
  for (const e of Array.isArray(brut.exemple) ? (brut.exemple as Record<string, unknown>[]) : []) {
    const k = typeof e?.url === "string" ? urlComparabil(e.url) : null;
    const sursa = k ? reale.get(k) : undefined;
    const ong = txt(e?.ong, LIM.ong);
    if (!sursa || !ong) continue;
    const an = txt(e?.an, 4);
    exemple.push({ ong, an: /^(19|20)\d{2}$/.test(an) ? an : null, detaliu: txt(e?.detaliu, LIM.detaliu), url: sursa.url });
    if (exemple.length >= MAX.exemple) break;
  }

  // „da” fără dovadă (niciun exemplu cu link real) nu se păstrează.
  const dovada = exemple.length > 0;
  const aSponsorizatOng = tri(brut.aSponsorizatOng) === "da" && !dovada ? "necunoscut" : tri(brut.aSponsorizatOng);
  const faceSponsorizari = tri(brut.faceSponsorizari) === "da" && !dovada ? "necunoscut" : tri(brut.faceSponsorizari);
  const apel = (brut.pregatireApel ?? {}) as Record<string, unknown>;
  const incredere = !dovada && incr(brut.incredere) === "mare" ? "medie" : incr(brut.incredere);

  return {
    aSponsorizatOng,
    faceSponsorizari,
    preferinta: pref(brut.preferinta),
    domenii: (Array.isArray(brut.domenii) ? brut.domenii : []).map((d) => txt(d, LIM.domeniu)).filter(Boolean).slice(0, MAX.domenii),
    exemple,
    rezumat: txt(brut.rezumat, LIM.rezumat),
    recomandare: txt(brut.recomandare, LIM.recomandare),
    pregatireApel: { deCe: txt(apel.deCe, LIM.deCe), unghi: txt(apel.unghi, LIM.unghi), cuiScriem: txt(apel.cuiScriem, LIM.cuiScriem) },
    incredere,
    surse: [...reale.values()].slice(0, MAX.surse),
    la: acum.toISOString(),
  };
}

// Citește profilul păstrat în companies.extra (JSON de încredere doar ca formă): întoarce null dacă nu e un obiect cu câmpurile de bază.
export function profilDinExtra(extra: unknown): ProfilFirma | null {
  const p = (extra as { profilAi?: unknown } | null)?.profilAi as Partial<ProfilFirma> | undefined;
  if (!p || typeof p !== "object" || typeof p.la !== "string") return null;
  return {
    aSponsorizatOng: tri(p.aSponsorizatOng),
    faceSponsorizari: tri(p.faceSponsorizari),
    preferinta: pref(p.preferinta),
    domenii: Array.isArray(p.domenii) ? p.domenii.map((d) => txt(d, LIM.domeniu)).filter(Boolean) : [],
    exemple: Array.isArray(p.exemple) ? p.exemple.filter((e) => e && typeof e.url === "string" && typeof e.ong === "string") : [],
    rezumat: txt(p.rezumat, LIM.rezumat),
    recomandare: txt(p.recomandare, LIM.recomandare),
    pregatireApel: { deCe: txt(p.pregatireApel?.deCe, LIM.deCe), unghi: txt(p.pregatireApel?.unghi, LIM.unghi), cuiScriem: txt(p.pregatireApel?.cuiScriem, LIM.cuiScriem) },
    incredere: incr(p.incredere),
    surse: Array.isArray(p.surse) ? p.surse.filter((s) => s && typeof s.url === "string") : [],
    la: p.la,
  };
}

// Pentru scor: firma a mai sponsorizat ONG-uri sau are program de sponsorizări, conform profilului (cu dovadă).
export function aSponsorizatConformProfilului(p: ProfilFirma | null): boolean {
  return Boolean(p && (p.aSponsorizatOng === "da" || p.faceSponsorizari === "da"));
}

export const ETICHETE_PREFERINTA: Record<Preferinta, string> = { d177: "D177 (redirecționare)", directa: "Sponsorizare directă", ambele: "Ambele", necunoscut: "Necunoscută" };
