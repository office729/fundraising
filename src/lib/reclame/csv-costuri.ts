// Import de costuri de reclame din CSV (export din Ads Manager sau tabel propriu): citire, recunoașterea coloanelor, normalizare, validare.
// Funcții pure, fără importuri. Nu se ghicește nimic în tăcere: rândurile invalide sunt raportate cu numărul liniei, iar coloanele recunoscute se pot corecta.

export const MAX_RANDURI = 20_000;

// Parser CSV cu ghilimele; separatorul (virgulă, punct și virgulă sau tab) se alege după prima linie. Elimină BOM-ul.
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, "");
  const prima = t.split(/\r?\n/, 1)[0] ?? "";
  const numara = (c: string) => prima.split(c).length - 1;
  const sep = numara(";") > numara(",") && numara(";") >= numara("\t") ? ";" : numara("\t") > numara(",") ? "\t" : ",";
  const randuri: string[][] = [];
  let rand: string[] = [];
  let camp = "";
  let ghilimele = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i]!;
    if (ghilimele) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          camp += '"';
          i++;
        } else ghilimele = false;
      } else camp += c;
    } else if (c === '"') ghilimele = true;
    else if (c === sep) {
      rand.push(camp);
      camp = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      rand.push(camp);
      camp = "";
      if (rand.some((x) => x.trim() !== "")) randuri.push(rand);
      rand = [];
    } else camp += c;
  }
  rand.push(camp);
  if (rand.some((x) => x.trim() !== "")) randuri.push(rand);
  return randuri;
}

const fara = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

export type CampMapat = "ziua" | "campanieNume" | "campanieCheie" | "setNume" | "setCheie" | "reclamaNume" | "reclamaCheie" | "cheltuiala" | "afisari" | "clicuri" | "plasament" | "cont";
export type Mapare = Partial<Record<CampMapat, number>>;

export const ETICHETE_CAMPURI: Record<CampMapat, string> = {
  ziua: "Ziua",
  campanieNume: "Numele campaniei",
  campanieCheie: "ID-ul campaniei",
  setNume: "Numele setului de reclame",
  setCheie: "ID-ul setului",
  reclamaNume: "Numele reclamei",
  reclamaCheie: "ID-ul reclamei",
  cheltuiala: "Suma cheltuită",
  afisari: "Afișări",
  clicuri: "Clicuri pe link",
  plasament: "Plasament / platformă",
  cont: "Contul publicitar",
};

// Antete recunoscute (în română și engleză, cum apar în exporturile din Meta, TikTok, LinkedIn și Google). Ordinea contează: prima potrivire câștigă.
const ALIASE: [CampMapat, RegExp][] = [
  ["campanieCheie", /^(campaign id|id campanie|id ul campaniei|campaign_id)$/],
  ["setCheie", /^(ad set id|adset id|ad group id|id set de reclame|id ul setului( de reclame)?|ad_set_id)$/],
  ["reclamaCheie", /^(ad id|id reclama|id ul reclamei|ad_id)$/],
  ["ziua", /^(day|date|ziua|data|by day|reporting starts|start date|start date \(in utc\)|stat time day)$/],
  ["campanieNume", /^(campaign name|campaign|numele campaniei|campanie|nume campanie)$/],
  ["setNume", /^(ad set name|adset name|ad group name|ad group|numele setului de reclame|set de reclame|numele grupului de reclame)$/],
  ["reclamaNume", /^(ad name|ad|numele reclamei|reclama|nume reclama|creative name)$/],
  ["cheltuiala", /^(amount spent.*|spend|cost|total cost|total spent.*|suma cheltuita.*|cheltuieli|cost total|cheltuiala)$/],
  ["afisari", /^(impressions|impression|afisari)$/],
  ["clicuri", /^(link clicks|clicuri pe link|clicks \(all\)|clicks|clicuri|outbound clicks.*)$/],
  ["plasament", /^(platform|placement|platforma|plasament|publisher platform)$/],
  ["cont", /^(account name|account id|ad account.*|numele contului|cont publicitar)$/],
];

export function detecteazaColoane(antet: string[]): Mapare {
  const mapare: Mapare = {};
  const folosite = new Set<number>();
  for (const [camp, re] of ALIASE) {
    const idx = antet.findIndex((h, i) => !folosite.has(i) && re.test(fara(h)));
    if (idx >= 0) {
      mapare[camp] = idx;
      folosite.add(idx);
    }
  }
  return mapare;
}

// Moneda din antetul coloanei de cost, ex. „Amount spent (RON)”; null dacă nu apare.
export function monedaDinAntet(antet: string[], mapare: Mapare): string | null {
  const h = mapare.cheltuiala === undefined ? "" : (antet[mapare.cheltuiala] ?? "");
  const m = /\(([A-Za-z]{3})\)/.exec(h);
  return m ? m[1]!.toUpperCase() : null;
}

// Număr din text, în formatele uzuale: 1.234,56 · 1,234.56 · 1234.56 · 1 234,56 · 12,5 lei. NaN dacă nu e un număr.
export function parseNumar(brut: string): number {
  let s = brut.replace(/[^\d.,\-()\s]/g, "").replace(/\s+/g, "").trim();
  if (!s) return NaN;
  let negativ = false;
  if (/^\(.*\)$/.test(s)) {
    negativ = true;
    s = s.slice(1, -1);
  }
  if (s.startsWith("-")) {
    negativ = !negativ;
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s)) return NaN;
  const ultimPunct = s.lastIndexOf(".");
  const ultimaVirgula = s.lastIndexOf(",");
  let zecimal: "." | "," | null = null;
  if (ultimPunct >= 0 && ultimaVirgula >= 0) zecimal = ultimPunct > ultimaVirgula ? "." : ",";
  else if (ultimPunct >= 0 || ultimaVirgula >= 0) {
    const sep = ultimPunct >= 0 ? "." : ",";
    const parti = s.split(sep);
    // un singur separator urmat de exact 3 cifre = separator de mii (1.234); altfel e zecimal (12,5 · 0.75 · 0,750)
    if (parti.length === 2 && (parti[1]!.length !== 3 || parti[0] === "0")) zecimal = sep;
  }
  const curat = zecimal ? s.split(zecimal === "." ? "," : ".").join("").replace(zecimal, ".") : s.replace(/[.,]/g, "");
  const n = Number(curat);
  return Number.isFinite(n) ? (negativ ? -n : n) : NaN;
}

// Data în YYYY-MM-DD din: 2026-10-05 · 05.10.2026 · 05/10/2026 (ziua întâi, ca în România) · 2026-10-05 12:00. null dacă nu e o dată reală.
export function parseData(brut: string): string | null {
  const s = brut.trim();
  let a: number, l: number, z: number;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(s);
  if (m) [a, l, z] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else if ((m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(s))) [z, l, a] = [Number(m[1]), Number(m[2]), Number(m[3])];
  else return null;
  const d = new Date(Date.UTC(a, l - 1, z));
  if (d.getUTCFullYear() !== a || d.getUTCMonth() !== l - 1 || d.getUTCDate() !== z) return null;
  if (a < 2015 || a > 2100) return null;
  return d.toISOString().slice(0, 10);
}

export type RandCost = {
  ziua: string;
  cont: string;
  campanieCheie: string;
  campanieNume: string;
  setCheie: string;
  setNume: string;
  reclamaCheie: string;
  reclamaNume: string;
  plasament: string;
  cheltuialaMinor: number;
  afisari: number | null;
  clicuri: number | null;
};

export type RezultatNormalizare = {
  randuri: RandCost[];
  erori: { linie: number; mesaj: string }[];
  ignorate: number; // rânduri de total/rezumat sau goale
  de: string | null;
  pana: string | null;
  totalMinor: number;
  campanii: { cheie: string; nume: string }[];
};

const TOTALURI = /^(total|totals|results from|rezultate|grand total|sum)/i;

// Transformă rândurile în costuri zilnice. Rândurile cu aceeași cheie (ex. defalcări pe vârstă) se adună. Sumele negative sunt respinse.
// `opt.locale` (implicit română) alege limba mesajelor de eroare.
export function normalizeaza(randuri: string[][], mapare: Mapare, opt: { platformaImplicita?: string; locale?: "ro" | "en" } = {}): RezultatNormalizare {
  const en = opt.locale === "en";
  const rez: RezultatNormalizare = { randuri: [], erori: [], ignorate: 0, de: null, pana: null, totalMinor: 0, campanii: [] };
  if (mapare.ziua === undefined || mapare.cheltuiala === undefined) {
    rez.erori.push({ linie: 1, mesaj: en ? "The required columns are missing: the day and the amount spent." : "Lipsesc coloanele obligatorii: ziua și suma cheltuită." });
    return rez;
  }
  const date = randuri.slice(1);
  if (date.length > MAX_RANDURI) {
    rez.erori.push({ linie: 1, mesaj: en ? `The file has more than ${MAX_RANDURI.toLocaleString("en-GB")} rows. Import it in shorter periods.` : `Fișierul are peste ${MAX_RANDURI.toLocaleString("ro-RO")} de rânduri. Importă-l pe perioade mai scurte.` });
    return rez;
  }
  const text = (r: string[], i: number | undefined) => (i === undefined ? "" : (r[i] ?? "").trim().slice(0, 200));
  const numarOpt = (r: string[], i: number | undefined): number | null => {
    if (i === undefined) return null;
    const v = (r[i] ?? "").trim();
    if (!v || v === "-" || v === "—") return null;
    const n = parseNumar(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  };
  const adunate = new Map<string, RandCost>();
  date.forEach((r, idx) => {
    const linie = idx + 2;
    const brutZi = text(r, mapare.ziua);
    if (!brutZi || TOTALURI.test(brutZi) || r.every((x) => x.trim() === "")) {
      rez.ignorate += 1;
      return;
    }
    const ziua = parseData(brutZi);
    if (!ziua) {
      rez.erori.push({ linie, mesaj: en ? `The date “${brutZi.slice(0, 30)}” was not recognised (use 2026-10-05 or 05.10.2026).` : `Data „${brutZi.slice(0, 30)}” nu a fost recunoscută (folosește 2026-10-05 sau 05.10.2026).` });
      return;
    }
    const sumaBrut = text(r, mapare.cheltuiala);
    const suma = parseNumar(sumaBrut);
    if (!Number.isFinite(suma)) {
      rez.erori.push({ linie, mesaj: en ? `The amount “${sumaBrut.slice(0, 30)}” is not a number.` : `Suma „${sumaBrut.slice(0, 30)}” nu e un număr.` });
      return;
    }
    if (suma < 0) {
      rez.erori.push({ linie, mesaj: en ? "The amount spent is negative; the row was ignored (corrections are made at the source)." : "Suma cheltuită e negativă; rândul a fost ignorat (corecțiile se fac în sursă)." });
      return;
    }
    const campanieNume = text(r, mapare.campanieNume);
    const campanieCheie = text(r, mapare.campanieCheie) || campanieNume;
    const rand: RandCost = {
      ziua,
      cont: text(r, mapare.cont),
      campanieCheie,
      campanieNume: campanieNume || campanieCheie,
      setCheie: text(r, mapare.setCheie) || text(r, mapare.setNume),
      setNume: text(r, mapare.setNume) || text(r, mapare.setCheie),
      reclamaCheie: text(r, mapare.reclamaCheie) || text(r, mapare.reclamaNume),
      reclamaNume: text(r, mapare.reclamaNume) || text(r, mapare.reclamaCheie),
      plasament: text(r, mapare.plasament).toLowerCase(),
      cheltuialaMinor: Math.round(suma * 100),
      afisari: numarOpt(r, mapare.afisari),
      clicuri: numarOpt(r, mapare.clicuri),
    };
    const cheie = [rand.ziua, rand.cont, rand.campanieCheie, rand.setCheie, rand.reclamaCheie, rand.plasament].join("\u0001");
    const existent = adunate.get(cheie);
    if (existent) {
      existent.cheltuialaMinor += rand.cheltuialaMinor;
      existent.afisari = existent.afisari === null && rand.afisari === null ? null : (existent.afisari ?? 0) + (rand.afisari ?? 0);
      existent.clicuri = existent.clicuri === null && rand.clicuri === null ? null : (existent.clicuri ?? 0) + (rand.clicuri ?? 0);
    } else adunate.set(cheie, rand);
  });
  rez.randuri = [...adunate.values()];
  for (const r of rez.randuri) {
    rez.totalMinor += r.cheltuialaMinor;
    if (!rez.de || r.ziua < rez.de) rez.de = r.ziua;
    if (!rez.pana || r.ziua > rez.pana) rez.pana = r.ziua;
  }
  const campanii = new Map<string, string>();
  for (const r of rez.randuri) if (r.campanieCheie && !campanii.has(r.campanieCheie)) campanii.set(r.campanieCheie, r.campanieNume);
  rez.campanii = [...campanii.entries()].map(([cheie, nume]) => ({ cheie, nume }));
  return rez;
}
