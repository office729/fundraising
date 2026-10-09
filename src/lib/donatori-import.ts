import { faraDiacritice } from "@/lib/cautare";
import { EMAIL_RE, normalizeazaEmail } from "@/lib/validation";

// Importul de donații în CRM Persoane fizice — partea pură (fără baza de date): detectarea coloanelor, parsarea sumelor și a datelor,
// normalizarea unui rând. Fișierul poate veni din orice platformă de plată sau din Excel; coloanele se potrivesc după nume.

export const CAMPURI_IMPORT = ["email", "nume", "suma", "data", "proiect", "localitate", "judet", "telefon", "procesator", "idExtern", "moneda", "status"] as const;
export type CampImport = (typeof CAMPURI_IMPORT)[number];
export const ETICHETE_IMPORT: Record<CampImport, string> = {
  email: "Email",
  nume: "Nume",
  suma: "Sumă",
  data: "Data donației",
  proiect: "Proiect / campanie",
  localitate: "Localitate",
  judet: "Județ",
  telefon: "Telefon",
  procesator: "Procesator / metodă de plată",
  idExtern: "ID tranzacție (extern)",
  moneda: "Monedă",
  status: "Status",
};
export const OBLIGATORII_IMPORT: CampImport[] = ["email", "suma", "data"];
export type Mapare = Partial<Record<CampImport, number>>; // indexul coloanei în fișier

const SINONIME: Record<CampImport, string[]> = {
  email: ["email", "e-mail", "mail", "adresaemail", "emaildonator", "emailul", "adresadeemail"],
  nume: ["nume", "numeprenume", "numesiprenume", "donator", "numedonator", "name", "fullname", "numecomplet", "prenumenume"],
  suma: ["suma", "sumadonata", "valoare", "amount", "total", "sumaron", "sumalei", "valoaredonatie", "donatie"],
  data: ["data", "datadonatiei", "datadonatie", "date", "created", "createdat", "datasiora", "timestamp", "datatranzactiei", "datapltii", "dataplatii"],
  proiect: ["proiect", "caz", "campanie", "beneficiar", "pentru", "cauza", "destinatie", "project", "campaign", "numeproiect", "numecaz", "numecampanie"],
  localitate: ["localitate", "oras", "city", "localitatea", "orasul"],
  judet: ["judet", "county", "judetul", "regiune"],
  telefon: ["telefon", "tel", "phone", "mobil", "nrtelefon", "numartelefon", "telefonmobil"],
  procesator: ["procesator", "metodaplata", "metoda", "platforma", "gateway", "processor", "paymentmethod", "metodadeplata", "sursa"],
  idExtern: ["id", "idtranzactie", "idextern", "transactionid", "tranzactie", "referinta", "reference", "idplata", "idtransaction", "paymentid", "nrtranzactie", "idcomanda"],
  moneda: ["moneda", "currency", "valuta"],
  status: ["status", "stare", "statusplata", "statustranzactie"],
};

const cheie = (s: unknown) => faraDiacritice(String(s ?? "")).toLowerCase().replace(/[^a-z0-9]/g, "");

// Potrivește fiecare câmp cu o coloană: întâi nume identic cu un sinonim, apoi coloană care conține sinonimul (cel mai lung câștigă).
export function detecteazaColoane(antet: unknown[]): Mapare {
  const chei = antet.map(cheie);
  const mapare: Mapare = {};
  const luate = new Set<number>();
  for (const camp of CAMPURI_IMPORT) {
    const sin = SINONIME[camp].map(cheie);
    let idx = chei.findIndex((h, i) => !luate.has(i) && h !== "" && sin.includes(h));
    if (idx < 0) {
      let cel = 0;
      chei.forEach((h, i) => {
        if (luate.has(i) || !h) return;
        for (const s of sin) if (s.length >= 4 && h.includes(s) && s.length > cel) { idx = i; cel = s.length; }
      });
    }
    if (idx >= 0) {
      mapare[camp] = idx;
      luate.add(idx);
    }
  }
  return mapare;
}

// ===== Sume =====
export function parseSuma(brut: unknown): number | null {
  if (typeof brut === "number") return Number.isFinite(brut) && brut > 0 ? brut : null;
  let s = String(brut ?? "").trim();
  if (!s) return null;
  s = s.replace(/[^\d.,-]/g, "");
  if (!s || s.startsWith("-")) return null;
  const pct = s.lastIndexOf(".");
  const vir = s.lastIndexOf(",");
  if (pct >= 0 && vir >= 0) {
    // „1.234,56” (virgula e zecimală) sau „1,234.56” (punctul e zecimal)
    s = vir > pct ? s.replace(/\./g, "").replace(",", ".") : s.replace(/,/g, "");
  } else if (vir >= 0) {
    s = /,\d{1,2}$/.test(s) && s.indexOf(",") === vir ? s.replace(",", ".") : s.replace(/,/g, "");
  } else if (pct >= 0) {
    s = /\.\d{1,2}$/.test(s) && s.indexOf(".") === pct ? s : s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ===== Date =====
export function parseData(brut: unknown, acum: Date = new Date()): Date | null {
  let d: Date | null = null;
  if (brut instanceof Date) d = brut;
  else if (typeof brut === "number" && Number.isFinite(brut)) {
    // număr serial Excel (zile de la 1899-12-30)
    if (brut > 20000 && brut < 80000) d = new Date(Math.round((brut - 25569) * 86400 * 1000));
  } else {
    const s = String(brut ?? "").trim();
    let m = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(s);
    if (m) d = construieste(+m[1], +m[2], +m[3], m[4], m[5], m[6]);
    else if ((m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[T\s,]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s))) d = construieste(+m[3], +m[2], +m[1], m[4], m[5], m[6]);
  }
  if (!d || Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() < 2000 || d.getTime() > acum.getTime() + 36 * 3600 * 1000) return null;
  return d;
}

function construieste(a: number, l: number, z: number, h?: string, mi?: string, se?: string): Date | null {
  if (l < 1 || l > 12 || z < 1 || z > 31) return null;
  const d = new Date(Date.UTC(a, l - 1, z, h ? +h : 9, mi ? +mi : 0, se ? +se : 0));
  return d.getUTCMonth() === l - 1 && d.getUTCDate() === z ? d : null; // respinge 31 februarie etc.
}

// ===== Rânduri =====
export type RandNormalizat = {
  email: string;
  nume: string;
  suma: number; // în moneda din fișier (înainte de conversie)
  moneda: string;
  data: Date;
  proiect: string | null;
  localitate: string | null;
  judet: string | null;
  telefon: string | null;
  procesator: string | null;
  idExtern: string | null;
};

const STATUS_BUN = /^(succe|reusit|paid|platit|completed|complet|ok|aprobat|approved|incasat|settled|captured|confirmat)/;
const STATUS_RAU = /(fail|esuat|refund|rambursat|cancel|anulat|declin|respins|pending|asteptare|abandon|dispute|chargeback|void)/;

export type RezultatRand = { ok: true; rand: RandNormalizat } | { ok: false; motiv: string };

const text = (v: unknown, max: number) => {
  const s = String(v ?? "").trim().slice(0, max);
  return s === "" ? null : s;
};

export function normalizeazaRand(celule: unknown[], m: Mapare, acum: Date = new Date()): RezultatRand {
  const ia = (c: CampImport) => (m[c] !== undefined ? celule[m[c]!] : undefined);
  const status = cheie(ia("status"));
  if (status && (STATUS_RAU.test(status) || !STATUS_BUN.test(status))) return { ok: false, motiv: "Status care nu e o donație reușită" };
  const email = normalizeazaEmail(String(ia("email") ?? "").trim());
  if (!email || !EMAIL_RE.test(email)) return { ok: false, motiv: "Email lipsă sau invalid" };
  const suma = parseSuma(ia("suma"));
  if (suma === null) return { ok: false, motiv: "Sumă lipsă sau invalidă" };
  const data = parseData(ia("data"), acum);
  if (!data) return { ok: false, motiv: "Dată lipsă sau invalidă" };
  const moneda = (text(ia("moneda"), 8) ?? "RON").toUpperCase().replace("LEI", "RON").replace("RON.", "RON");
  return {
    ok: true,
    rand: {
      email,
      nume: text(ia("nume"), 200) ?? email.split("@")[0],
      suma,
      moneda,
      data,
      proiect: text(ia("proiect"), 200),
      localitate: text(ia("localitate"), 200),
      judet: text(ia("judet"), 100),
      telefon: text(ia("telefon"), 200),
      procesator: text(ia("procesator"), 100),
      idExtern: text(ia("idExtern"), 200),
    },
  };
}

// Detectează separatorul unui CSV (Excel românesc salvează de obicei cu „;”).
export function detecteazaSeparator(text: string): string {
  const prima = text.split(/\r?\n/).find((l) => l.trim() !== "") ?? "";
  const n = (c: string) => prima.split(c).length - 1;
  const cand: [string, number][] = [[";", n(";")], ["\t", n("\t")], [",", n(",")], ["|", n("|")]];
  cand.sort((a, b) => b[1] - a[1]);
  return cand[0][1] > 0 ? cand[0][0] : ",";
}

// Cheie pentru a recunoaște o donație deja existentă (aceeași persoană, aceeași zi, aceeași sumă în lei).
export const cheieDonatie = (email: string, data: Date, sumaLei: number) => `${email.toLowerCase()}|${data.toISOString().slice(0, 10)}|${Math.round(sumaLei)}`;
