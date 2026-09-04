import type { Companie, EtapaCompanie } from "../mock/companii";
import type { Donator, SegmentDonator } from "../mock/donatori";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Caută coloana din `row` al cărei nume (normalizat) se potrivește cu oricare
// dintre aliasurile date — potrivire exactă întâi, apoi parțială. Întoarce
// numele coloanei (nu valoarea), ca UI-ul de mapare să poată arăta ce a
// ghicit automat și utilizatorul să poată corecta manual dacă e nevoie.
export function findColumn(row: Record<string, string>, aliases: string[]): string {
  const keys = Object.keys(row);
  const normKeys = keys.map((k) => [k, norm(k)] as const);

  for (const alias of aliases) {
    const target = norm(alias);
    const key = normKeys.find(([, nk]) => nk === target)?.[0];
    if (key) return key;
  }
  for (const alias of aliases) {
    const target = norm(alias);
    if (!target) continue;
    const key = normKeys.find(([, nk]) => nk.includes(target) || target.includes(nk))?.[0];
    if (key) return key;
  }
  return "";
}

// `mappedKey` vine din UI-ul de mapare manuală (dacă utilizatorul a ales
// explicit o coloană) — are prioritate; altfel cade pe ghicirea automată
// după alias-uri, ca înainte.
function pick(row: Record<string, string>, aliases: string[], mappedKey?: string): string {
  const key = mappedKey || findColumn(row, aliases);
  return key ? (row[key] ?? "").trim() : "";
}

function toNumber(s: string): number {
  const cleaned = s.replace(/[^\d,.-]/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function segmentDinSuma(total: number): SegmentDonator {
  if (total >= 8000) return "major";
  if (total >= 2000) return "fidel";
  return "nou";
}

let importCounter = 0;
function nextId(prefix: string) {
  importCounter += 1;
  return `${prefix}-imp-${Date.now()}-${importCounter}`;
}

export const DONATOR_ALIASES = {
  nume: ["nume", "name", "numecomplet", "numedonator", "fullname", "donator", "numeprenume"],
  email: ["email", "e-mail", "adresaemail", "mail"],
  telefon: ["telefon", "phone", "tel", "numartelefon", "mobil"],
  localitate: ["localitate", "oras", "city", "localitatea"],
  totalDonat: ["totaldonat", "total", "suma", "sumatotala", "sumadonata", "amount", "valoare"],
  responsabil: ["responsabil", "owner"],
  consimtamant: ["consimtamant", "consent", "gdpr"],
} as const;

export type DonatorFieldKey = keyof typeof DONATOR_ALIASES;
export type ColumnMapping = Partial<Record<string, string>>;

export function guessDonatorMapping(row: Record<string, string>): Record<DonatorFieldKey, string> {
  const out = {} as Record<DonatorFieldKey, string>;
  (Object.keys(DONATOR_ALIASES) as DonatorFieldKey[]).forEach((field) => {
    out[field] = findColumn(row, [...DONATOR_ALIASES[field]]);
  });
  return out;
}

export function normalizeDonatorRow(row: Record<string, string>, mapping: ColumnMapping = {}): Donator {
  const nume = pick(row, [...DONATOR_ALIASES.nume], mapping.nume) || "Donator importat";
  const totalDonat = toNumber(pick(row, [...DONATOR_ALIASES.totalDonat], mapping.totalDonat));
  const segment = (pick(row, ["segment"]).toLowerCase() as SegmentDonator) || segmentDinSuma(totalDonat);
  const monedaRaw = pick(row, ["moneda", "currency"]).toUpperCase();
  return {
    id: nextId("don"),
    nume,
    email: pick(row, [...DONATOR_ALIASES.email], mapping.email),
    telefon: pick(row, [...DONATOR_ALIASES.telefon], mapping.telefon),
    localitate: pick(row, [...DONATOR_ALIASES.localitate], mapping.localitate),
    tip: pick(row, ["tip", "tipdonator"]) === "recurent" ? "recurent" : "unic",
    status: (pick(row, ["status"]) as Donator["status"]) || (segment === "inactiv" ? "inactiv" : "activ"),
    segment: (["nou", "fidel", "major", "recurent", "in_risc", "inactiv", "reactivat"] as const).includes(segment)
      ? segment
      : segmentDinSuma(totalDonat),
    scorImplicare: Number(pick(row, ["scorimplicare", "scor"])) || Math.min(99, Math.round(30 + totalDonat / 500)),
    rfm: { r: 3, f: 3, m: 3 },
    totalDonat,
    moneda: (["RON", "EUR", "USD"] as const).includes(monedaRaw as "RON" | "EUR" | "USD")
      ? (monedaRaw as "RON" | "EUR" | "USD")
      : "RON",
    ultimaDonatieLa: pick(row, ["ultimadonatiela", "ultimadonatie", "lastdonation", "datadonatie", "data"]) || new Date().toISOString(),
    responsabil: pick(row, [...DONATOR_ALIASES.responsabil], mapping.responsabil) || "Neasignat",
    campaniiPreferate: pick(row, ["campanie", "campanii", "campaign", "proiect", "caz"])
      .split(/[,;]/)
      .map((c) => c.trim())
      .filter(Boolean),
    consimtamant: (pick(row, [...DONATOR_ALIASES.consimtamant], mapping.consimtamant) as Donator["consimtamant"]) || "necunoscut",
  };
}

const STAGES: EtapaCompanie[] = [
  "nou", "pe_viitor", "email", "mesaj", "onepager", "telefon", "online",
  "contract_trimis", "contract_semnat", "contract_asteptare", "contract_anulat", "sponsorizat",
];

export const COMPANIE_ALIASES = {
  nume: ["nume", "denumire", "name", "companie", "firma", "denumirefirma", "denumirecompanie"],
  cui: ["cui", "vat", "cif"],
  industrie: ["industrie", "domeniu", "industry"],
  judet: ["judet", "county"],
  localitate: ["localitate", "oras", "city"],
  sumaSponsorizata: ["sumasponsorizata", "sponsorizat"],
  responsabil: ["responsabil", "owner"],
} as const;

export type CompanieFieldKey = keyof typeof COMPANIE_ALIASES;

export function guessCompanieMapping(row: Record<string, string>): Record<CompanieFieldKey, string> {
  const out = {} as Record<CompanieFieldKey, string>;
  (Object.keys(COMPANIE_ALIASES) as CompanieFieldKey[]).forEach((field) => {
    out[field] = findColumn(row, [...COMPANIE_ALIASES[field]]);
  });
  return out;
}

export function normalizeCompanieRow(row: Record<string, string>, mapping: ColumnMapping = {}): Companie {
  const nume = pick(row, [...COMPANIE_ALIASES.nume], mapping.nume) || "Companie importată";
  const stageRaw = norm(pick(row, ["stage", "etapa"]));
  const stage = STAGES.find((s) => norm(s) === stageRaw) || "nou";
  const statusRaw = pick(row, ["status"]).toLowerCase();
  const mecanismRaw = norm(pick(row, ["mecanism"]));
  const MECANISME = ["d177", "sponsorizare20", "ambele", "niciunul"] as const;
  const mecanism = MECANISME.find((m) => norm(m) === mecanismRaw) || "niciunul";
  return {
    id: nextId("co"),
    nume,
    cui: pick(row, [...COMPANIE_ALIASES.cui], mapping.cui),
    industrie: pick(row, [...COMPANIE_ALIASES.industrie], mapping.industrie),
    judet: pick(row, [...COMPANIE_ALIASES.judet], mapping.judet),
    localitate: pick(row, [...COMPANIE_ALIASES.localitate], mapping.localitate),
    site: pick(row, ["site", "website"]),
    administrator: pick(row, ["administrator", "ceo", "contact"]),
    ca: toNumber(pick(row, ["ca", "cifradeafaceri", "revenue"])),
    profit: toNumber(pick(row, ["profit"])),
    nrAngajati: Math.round(toNumber(pick(row, ["nrangajati", "angajati", "employees"]))),
    stage,
    status: (["open", "won", "lost", "parked"] as const).includes(statusRaw as "open" | "won" | "lost" | "parked")
      ? (statusRaw as "open" | "won" | "lost" | "parked")
      : "open",
    sumaSponsorizata: toNumber(pick(row, [...COMPANIE_ALIASES.sumaSponsorizata], mapping.sumaSponsorizata)),
    sumaDisponibila: toNumber(pick(row, ["sumadisponibila", "disponibil"])),
    ultimaActivitateLa: pick(row, ["ultimaactivitatela", "ultimaactivitate"]) || new Date().toISOString(),
    responsabil: pick(row, [...COMPANIE_ALIASES.responsabil], mapping.responsabil) || "Neasignat",
    urmatoareaActiune: pick(row, ["urmatoareaactiune", "nextaction"]) || "De contactat",
    mecanism,
    formular230: pick(row, ["formular230"]).toLowerCase() === "da",
    proiect: pick(row, ["proiect", "caz"]),
    lunaDecizie: Number(pick(row, ["lunadecizie"])) || 12,
    caen: pick(row, ["caen"]),
    regCom: pick(row, ["regcom", "regcomert"]),
    anInfiintare: Number(pick(row, ["aninfiintare", "infiintare"])) || new Date().getFullYear(),
    numarContract: pick(row, ["numarcontract", "nrcontract"]),
    dataSemnare: pick(row, ["datasemnare", "datasemnarii"]),
  };
}
