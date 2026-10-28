// Categorii de funcții ale persoanelor de contact din firme, pentru filtrul din CRM Companii.
// Funcția (`contacts.rol`) și departamentul (`contacts.dept`) sunt text liber (scrise de mână sau aduse de
// îmbogățirea datelor, uneori în engleză), așa că o categorie e un set de cuvinte-cheie, căutate insensibil la
// diacritice, la începutul unui cuvânt. Un cuvânt care se termină cu „$” trebuie să fie întreg („ceo$” nu prinde „ceok”).
// Aceeași expresie regulată se folosește și în SQL (Postgres), și în JS (teste, previzualizare), ca rezultatele să coincidă.
// Fără importuri: modul pur, testat direct cu `npm test`.

export type CheieFunctie = "conducere" | "financiar" | "marketing" | "csr" | "hr" | "vanzari" | "operatiuni" | "juridic" | "secretariat";

export const CHEI_FUNCTII: readonly CheieFunctie[] = ["conducere", "financiar", "marketing", "csr", "hr", "vanzari", "operatiuni", "juridic", "secretariat"];

// „nespecificat” nu e o categorie de cuvinte-cheie: firmele cu contacte la care funcția și departamentul nu sunt completate.
export const FUNCTIE_NESPECIFICATA = "nespecificat";

const CUVINTE: Record<CheieFunctie, readonly string[]> = {
  conducere: ["administrator", "director general", "general manager", "manager general", "ceo$", "chief executive", "managing", "director executiv", "presedinte", "vicepresedinte", "fondator", "founder", "proprietar", "owner$", "patron", "board", "asociat"],
  financiar: ["financ", "cfo$", "contabil", "accounting", "economic", "economist", "trezorerie", "controller", "fiscal", "buget", "audit"],
  marketing: ["marketing", "cmo$", "comunicare", "communication", "pr$", "public relations", "relatii publice", "brand", "social media", "digital", "publicitate", "advertising", "content"],
  csr: ["csr", "sustenabil", "sustainab", "responsabilitate", "sponsoriz", "esg$", "impact", "filantrop", "corporate affairs", "relatii externe", "comunitate", "community"],
  hr: ["resurse umane", "human resources", "hr$", "hrbp", "recrut", "talent", "people", "personal$"],
  vanzari: ["vanzari", "sales", "comercial", "commercial", "business development", "account manager"],
  operatiuni: ["operatiuni", "operations", "coo$", "achizitii", "procurement", "logistic", "productie", "production", "tehnic", "technical", "cto$", "it$", "proiect"],
  juridic: ["juridic", "legal", "avocat", "jurist", "compliance", "conformitate", "consilier juridic"],
  secretariat: ["secretar", "asistent", "assistant", "office manager", "receptie", "reception", "executive assistant"],
};

export function faraDiacriticeMinuscule(s: string): string {
  return s
    .replace(/[șş]/gi, "s")
    .replace(/[țţ]/gi, "t")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function esteCheie(v: string): v is CheieFunctie {
  return (CHEI_FUNCTII as readonly string[]).includes(v);
}

// Expresia regulată (sintaxă comună JS / Postgres ARE) pentru o categorie, aplicată pe text deja fără diacritice și cu litere mici.
export function regexFunctie(cheie: CheieFunctie): string {
  const alternative = CUVINTE[cheie].map((c) => {
    const intreg = c.endsWith("$");
    const cuvant = (intreg ? c.slice(0, -1) : c).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "[ ]+");
    return intreg ? `${cuvant}(?![a-z0-9])` : cuvant;
  });
  return `(^|[^a-z0-9])(?:${alternative.join("|")})`;
}

// Textul pe care se potrivește categoria: funcția și departamentul, lipite.
export function textFunctie(rol: string | null | undefined, dept: string | null | undefined): string {
  return faraDiacriticeMinuscule(`${rol ?? ""} ${dept ?? ""}`.trim());
}

export function potriveste(cheie: CheieFunctie, rol: string | null | undefined, dept: string | null | undefined): boolean {
  return new RegExp(regexFunctie(cheie)).test(textFunctie(rol, dept));
}

// Categoriile (în ordinea listei) în care intră o persoană; poate fi în mai multe („Director marketing și vânzări”).
export function categoriiPersoana(rol: string | null | undefined, dept: string | null | undefined): CheieFunctie[] {
  return CHEI_FUNCTII.filter((c) => potriveste(c, rol, dept));
}

// Selecția din adresă: chei valide, fără dubluri; „nespecificat” se păstrează separat.
export function curataSelectieFunctii(brut: string[]): string[] {
  const valide = new Set<string>();
  for (const v of brut) if (esteCheie(v) || v === FUNCTIE_NESPECIFICATA) valide.add(v);
  return [...valide];
}

export { esteCheie as esteCheieFunctie };

// ===== Senioritate și departament dedus din funcție (pentru insigna din fișa persoanei) =====
export type Senioritate = "c-level" | "director" | "manager";
export const ETICHETE_SENIORITATE: Record<Senioritate, string> = { "c-level": "C-level", director: "Director", manager: "Manager" };

const RE_C_LEVEL = /(^|[^a-z0-9])(ceo|cfo|coo|cmo|cto|cio|chief|owner|co-?founder|founder|fondator|administrator|director general|general manager|managing director|country manager|presedinte|president|vicepresedinte|vp|board|asociat|partner|partener)(?![a-z0-9])/;
const RE_DIRECTOR = /(^|[^a-z0-9])(director|head of|sef|lead)(?![a-z0-9])/;
const RE_MANAGER = /(^|[^a-z0-9])(manager|coordonator|responsabil|supervisor)(?![a-z0-9])/;

// C-level (conducere), Director sau Manager, dedus din titlu; null când titlul nu spune nimic despre nivel. Primul care se potrivește câștigă („director general” e C-level).
export function senioritate(rol: string | null | undefined): Senioritate | null {
  const t = faraDiacriticeMinuscule((rol ?? "").trim());
  if (!t) return null;
  if (RE_C_LEVEL.test(t)) return "c-level";
  if (RE_DIRECTOR.test(t)) return "director";
  if (RE_MANAGER.test(t)) return "manager";
  return null;
}

const ETICHETE_DEPARTAMENT: Record<CheieFunctie, string> = {
  conducere: "Conducere",
  financiar: "Financiar",
  marketing: "Marketing",
  csr: "CSR",
  hr: "HR",
  vanzari: "Vânzări",
  operatiuni: "Operațiuni",
  juridic: "Juridic",
  secretariat: "Secretariat",
};

// Departamentul scris la persoană, dacă există; altfel cel dedus din funcție (prima categorie potrivită, în ordinea listei). Gol când nu se poate deduce.
export function departamentDinFunctie(rol: string | null | undefined, dept: string | null | undefined): string {
  if ((dept ?? "").trim()) return (dept as string).trim();
  const cat = categoriiPersoana(rol, null)[0];
  return cat ? ETICHETE_DEPARTAMENT[cat] : "";
}
