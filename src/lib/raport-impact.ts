// Raport de impact pentru companii: datele de intrare, curățarea lor și textele derivate (total, perioadă, narativ cu placeholdere).
// Fără acces la baza de date și fără React, ca să poată fi folosit și în browser (previzualizare) și în teste.

export const MODELE_IMPACT = [
  { id: "clasic", eticheta: "Clasic", hint: "Cald, cu serif, copertă cu inimă și fișe de proiect" },
  { id: "executiv", eticheta: "Executiv", hint: "Sobru, cu rezumat lateral și tabel cu bare, pentru directori financiari" },
  { id: "editorial", eticheta: "Editorial", hint: "Copertă tip revistă și poveste în pagină" },
  { id: "carduri", eticheta: "Carduri", hint: "Fiecare proiect pe un card, vizual" },
  { id: "scrisoare", eticheta: "Scrisoare de mulțumire", hint: "Hârtie cu antet, pentru una sau două donații" },
  { id: "minimal", eticheta: "Minimal", hint: "Mult spațiu alb și o cifră mare" },
  { id: "cronologic", eticheta: "Cronologic", hint: "Proiectele pe linia timpului" },
  { id: "infografic", eticheta: "Infografic", hint: "Cifre mari, inel cu ponderea proiectelor" },
  { id: "corporate", eticheta: "Corporate", hint: "Antet închis, tabel formal și zone de semnătură" },
  { id: "o-pagina", eticheta: "O pagină", hint: "Sumar condensat, pentru print rapid" },
  { id: "afis", eticheta: "Afiș", hint: "Un singur mesaj mare: „Mulțumim”" },
  { id: "mozaic", eticheta: "Mozaic", hint: "Plăci de mărimi diferite, modern" },
  { id: "certificat", eticheta: "Certificat", hint: "Certificat de recunoștință, cu ramă și sigiliu" },
  { id: "prezentare", eticheta: "Prezentare", hint: "Diapozitive 16:9, pentru ecran sau PDF" },
  { id: "analitic", eticheta: "Analitic", hint: "Tablou de bord cu grafice, pentru cine vrea cifrele" },
] as const;
export type ModelImpact = (typeof MODELE_IMPACT)[number]["id"];

export const MECANISME_IMPACT = [
  { id: "d177", eticheta: "Direcționarea impozitului pe profit (Declarația 177)", fraza: "direcționarea unei părți din impozitul pe profit către organizație, prin Declarația 177" },
  { id: "sponsorizare", eticheta: "Sponsorizare", fraza: "sponsorizare, în baza Legii nr. 32/1994" },
] as const;
export type MecanismImpact = (typeof MECANISME_IMPACT)[number]["id"];

export type ProiectImpact = {
  nume: string;
  suma: number | null; // lei
  data: string; // YYYY-MM-DD sau gol
  link: string; // adresa paginii publice a proiectului, sau gol
  observatii: string;
  locatie: string; // partener / loc de desfășurare
  anDirectionare: number | null; // pentru Declarația 177
};

export type DateImpact = {
  firma: string;
  proiecte: ProiectImpact[];
  totalManual: number | null;
  mecanism: MecanismImpact;
  narativ: string;
  accent: string;
  accent2: string;
  accent3: string;
  gruparePeAn: boolean;
  autor: string;
  logoFirma: string; // logoul firmei (încărcat în pagină sau adresă https)
  logoOng: string; // logoul organizației
  model: ModelImpact;
};

export const CULORI_IMPLICITE = { accent: "#b3261e", accent2: "#7f1d1d", accent3: "#fdf1ef" };

export const NARATIV_IMPLICIT = `Vă mulțumim, {FIRMA}! Prin {MECANISM}, ați susținut {NR_PROIECTE} proiecte, în valoare totală de {TOTAL}.

Fiecare sumă a ajuns acolo unde era nevoie de ea, iar rezultatele pot fi urmărite pe paginile publice ale proiectelor. Acest raport vă arată ce s-a făcut cu sprijinul dumneavoastră.`;

export const PROIECT_GOL: ProiectImpact = { nume: "", suma: null, data: "", link: "", observatii: "", locatie: "", anDirectionare: null };

export const dateImpactGoale = (): DateImpact => ({
  firma: "",
  proiecte: [],
  totalManual: null,
  mecanism: "sponsorizare",
  narativ: NARATIV_IMPLICIT,
  ...CULORI_IMPLICITE,
  gruparePeAn: false,
  autor: "",
  logoFirma: "",
  logoOng: "",
  model: "clasic",
});

const HEX = /^#[0-9a-f]{6}$/i;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const numar = (v: unknown): number | null => {
  if (v === "" || v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n < 1e10 ? Math.round(n) : null;
};
const urlHttp = (v: unknown) => {
  const s = text(v, 500);
  return /^https?:\/\/[^\s"'<>]+$/i.test(s) ? s : "";
};
// Logoul: adresă https sau imagine încorporată (data:), nimic altceva (fără javascript:, fără alte scheme).
const urlLogo = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (/^https:\/\/[^\s"'<>]+$/i.test(s) && s.length <= 500) return s;
  if (/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(s) && s.length <= 300_000) return s;
  return "";
};

// Orice vine din formular sau din baza de date trece pe aici: tipuri, lungimi, scheme de adrese și culori sigure.
export function curataDateImpact(brut: unknown): DateImpact {
  const b = (brut && typeof brut === "object" ? brut : {}) as Record<string, unknown>;
  const gol = dateImpactGoale();
  const proiecte = (Array.isArray(b.proiecte) ? b.proiecte : []).slice(0, 100).map((x): ProiectImpact => {
    const p = (x && typeof x === "object" ? x : {}) as Record<string, unknown>;
    const an = numar(p.anDirectionare);
    return {
      nume: text(p.nume, 200),
      suma: numar(p.suma),
      data: ISO.test(text(p.data, 10)) ? text(p.data, 10) : "",
      link: urlHttp(p.link),
      observatii: text(p.observatii, 600),
      locatie: text(p.locatie, 200),
      anDirectionare: an !== null && an >= 2000 && an <= 2100 ? an : null,
    };
  });
  return {
    firma: text(b.firma, 200),
    proiecte,
    totalManual: numar(b.totalManual),
    mecanism: MECANISME_IMPACT.some((m) => m.id === b.mecanism) ? (b.mecanism as MecanismImpact) : gol.mecanism,
    narativ: typeof b.narativ === "string" ? b.narativ.slice(0, 5000) : gol.narativ,
    accent: HEX.test(String(b.accent)) ? String(b.accent) : gol.accent,
    accent2: HEX.test(String(b.accent2)) ? String(b.accent2) : gol.accent2,
    accent3: HEX.test(String(b.accent3)) ? String(b.accent3) : gol.accent3,
    gruparePeAn: b.gruparePeAn === true,
    autor: text(b.autor, 100),
    logoFirma: urlLogo(b.logoFirma),
    // Versiunile vechi aveau un singur logo, al organizației.
    logoOng: urlLogo(b.logoOng ?? b.logoUrl),
    model: MODELE_IMPACT.some((m) => m.id === b.model) ? (b.model as ModelImpact) : gol.model,
  };
}

export const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export const lei = (n: number) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} lei`;

const LUNI = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
export const lunaAn = (iso: string) => (ISO.test(iso) ? `${LUNI[Number(iso.slice(5, 7)) - 1] ?? ""} ${iso.slice(0, 4)}`.trim() : "");
export const dataLunga = (iso: string) => (ISO.test(iso) ? `${Number(iso.slice(8, 10))} ${LUNI[Number(iso.slice(5, 7)) - 1] ?? ""} ${iso.slice(0, 4)}` : "");

export const totalImpact = (d: DateImpact) => d.totalManual ?? d.proiecte.reduce((s, p) => s + (p.suma ?? 0), 0);
export const fraza = (d: DateImpact) => MECANISME_IMPACT.find((m) => m.id === d.mecanism)!.fraza;

export function perioadaImpact(d: DateImpact): string {
  const date = d.proiecte.map((p) => p.data).filter((x) => ISO.test(x)).sort();
  if (date.length === 0) return "";
  const a = lunaAn(date[0]);
  const z = lunaAn(date[date.length - 1]);
  return a === z ? a : `${a} – ${z}`;
}

// Anul după care se grupează un proiect: anul direcționării (Declarația 177), altfel anul datei.
export const anProiect = (p: ProiectImpact): number | null => p.anDirectionare ?? (ISO.test(p.data) ? Number(p.data.slice(0, 4)) : null);

export function proiecteSortate(d: DateImpact): ProiectImpact[] {
  return [...d.proiecte].filter((p) => p.nume).sort((a, b) => (a.data || "9999").localeCompare(b.data || "9999") || a.nume.localeCompare(b.nume, "ro"));
}

export function grupePeAn(d: DateImpact): { an: string; proiecte: ProiectImpact[]; total: number }[] {
  const harta = new Map<string, ProiectImpact[]>();
  for (const p of proiecteSortate(d)) {
    const k = String(anProiect(p) ?? "Fără an");
    harta.set(k, [...(harta.get(k) ?? []), p]);
  }
  return [...harta.entries()].map(([an, proiecte]) => ({ an, proiecte, total: proiecte.reduce((s, p) => s + (p.suma ?? 0), 0) }));
}

// Placeholderele din narativ ({FIRMA}, {NR_PROIECTE}, {MECANISM}, {TOTAL}, {PERIOADA}; {CAZURI} / {NR_CAZURI} rămân valabile pentru textele vechi).
// Textul și valorile se escapează, apoi rezultatul e împărțit pe paragrafe (rând liber).
export function aplicaPlaceholdere(textBrut: string, d: DateImpact): string[] {
  const nr = d.proiecte.filter((p) => p.nume).length;
  const valori: Record<string, string> = {
    FIRMA: d.firma || "compania dumneavoastră",
    PROIECTE: String(nr),
    NR_PROIECTE: String(nr),
    CAZURI: String(nr),
    NR_CAZURI: String(nr),
    MECANISM: fraza(d),
    TOTAL: lei(totalImpact(d)),
    PERIOADA: perioadaImpact(d),
  };
  return esc(textBrut)
    .replace(/\{([A-Z_]+)\}/g, (m, k: string) => (k in valori ? esc(valori[k]) : m))
    .split(/\n\s*\n/)
    .map((p) => p.trim().replace(/\n/g, "<br>"))
    .filter(Boolean);
}
