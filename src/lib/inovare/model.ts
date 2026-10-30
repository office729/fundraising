// Centrul de inovare în fundraising: ideile ONG-urilor, voturile și starea lor. Funcții și constante pure, fără importuri, ca să se testeze.

export type StareIdee = "propus" | "in_planificare" | "in_dezvoltare" | "finalizat" | "nu_acum";
export const STARI: { cheie: StareIdee; eticheta: string; descriere: string }[] = [
  { cheie: "propus", eticheta: "Propusă", descriere: "A fost trimisă și așteaptă voturi și analiza echipei." },
  { cheie: "in_planificare", eticheta: "În planificare", descriere: "Am decis să o facem și o programăm." },
  { cheie: "in_dezvoltare", eticheta: "În dezvoltare", descriere: "Lucrăm acum la ea." },
  { cheie: "finalizat", eticheta: "Finalizată", descriere: "E gata și o poți folosi." },
  { cheie: "nu_acum", eticheta: "Nu acum", descriere: "Nu o facem în perioada următoare; rămâne aici cu explicația echipei." },
];
export const ETICHETE_STARE: Record<StareIdee, string> = Object.fromEntries(STARI.map((s) => [s.cheie, s.eticheta])) as Record<StareIdee, string>;
export const esteStare = (x: unknown): x is StareIdee => typeof x === "string" && x in ETICHETE_STARE;

export type Efort = "scazut" | "mediu" | "mare";
export const ETICHETE_EFORT: Record<Efort, string> = { scazut: "Efort mic", mediu: "Efort mediu", mare: "Efort mare" };
export const esteEfort = (x: unknown): x is Efort => x === "scazut" || x === "mediu" || x === "mare";

export const CATEGORII = [
  "Strângere de fonduri",
  "Donatori",
  "Companii și sponsorizări",
  "Formular 230",
  "Voluntari",
  "Rapoarte și statistici",
  "Comunicare",
  "Integrări",
  "Import și export",
  "Altele",
] as const;
export type Categorie = (typeof CATEGORII)[number];
export const esteCategorie = (x: unknown): x is Categorie => typeof x === "string" && (CATEGORII as readonly string[]).includes(x);

export const LIMITE = { titluMin: 8, titluMax: 120, descriereMin: 20, descriereMax: 2000, acumMax: 1000, raspunsMax: 2000 };

export type DatePropunere = { titlu: string; descriere: string; cumFaciAcum: string; categorie: Categorie; afiseazaOrganizatia: boolean };

export function valideazaPropunere(x: unknown): { ok: true; date: DatePropunere } | { ok: false; erori: Partial<Record<"titlu" | "descriere" | "categorie", string>> } {
  const r = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
  const t = (k: string, max: number) => (typeof r[k] === "string" ? (r[k] as string).replace(/\s+/g, " ").trim().slice(0, max) : "");
  const titlu = t("titlu", LIMITE.titluMax);
  // Descrierea păstrează rândurile noi (paragrafele), dar limitează spațiile multiple.
  const descriere = (typeof r.descriere === "string" ? r.descriere : "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, LIMITE.descriereMax);
  const cumFaciAcum = (typeof r.cumFaciAcum === "string" ? r.cumFaciAcum : "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, LIMITE.acumMax);
  const erori: Partial<Record<"titlu" | "descriere" | "categorie", string>> = {};
  if (titlu.length < LIMITE.titluMin) erori.titlu = `Scrie un titlu de cel puțin ${LIMITE.titluMin} caractere.`;
  if (descriere.length < LIMITE.descriereMin) erori.descriere = `Explică ideea în cel puțin ${LIMITE.descriereMin} de caractere: ce problemă rezolvă?`;
  if (!esteCategorie(r.categorie)) erori.categorie = "Alege o categorie.";
  if (Object.keys(erori).length) return { ok: false, erori };
  return { ok: true, date: { titlu, descriere, cumFaciAcum, categorie: r.categorie as Categorie, afiseazaOrganizatia: r.afiseazaOrganizatia !== false } };
}

// ---------- idei asemănătoare (înainte de a propune, vezi dacă există deja) ----------

const CUVINTE_GOALE = new Set(["si", "sa", "de", "la", "in", "pe", "cu", "un", "o", "ce", "cum", "pentru", "din", "al", "ale", "a", "e", "este", "sau", "mai", "prin", "fie", "fi", "nu", "se", "ca", "the", "to", "of", "and"]);
const tokeni = (s: string): Set<string> =>
  new Set(
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 2 && !CUVINTE_GOALE.has(w))
      .map((w) => w.slice(0, 4)), // rădăcină aproximativă: „donator”, „donatori”, „donații” se potrivesc
  );

// Cât de asemănătoare sunt două titluri (0–1): cuvintele comune ÷ cuvintele celui mai scurt.
export function asemanare(a: string, b: string): number {
  const ta = tokeni(a);
  const tb = tokeni(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let comune = 0;
  for (const w of ta) if (tb.has(w)) comune++;
  return comune / Math.min(ta.size, tb.size);
}

export function ideiSimilare<T extends { titlu: string }>(titlu: string, existente: T[], prag = 0.6, maxim = 3): T[] {
  if (titlu.trim().length < 6) return [];
  return existente
    .map((e) => ({ e, s: asemanare(titlu, e.titlu) }))
    .filter((x) => x.s >= prag)
    .sort((a, b) => b.s - a.s)
    .slice(0, maxim)
    .map((x) => x.e);
}

export type Sortare = "voturi" | "noi";
export const esteSortare = (x: unknown): x is Sortare => x === "voturi" || x === "noi";
