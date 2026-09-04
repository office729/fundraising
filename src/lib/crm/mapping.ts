// Funcții PURE de mapare (fără DB/secrete) — portate din SOI_CRM neschimbate,
// testabile izolat. NU adăuga „server-only" aici.
//
// Maparea între forma PLATĂ a firmei folosită de tool-ul CRM (camelCase) și
// rândul relațional (coloane + `extra` jsonb + `contacts`).
//
// Principiul „zero pierdere de muncă": split SIMETRIC.
//  - la CITIRE: împrăștiem TOATE cheile din `extra` în obiect, apoi coloanele
//    mapate le suprascriu → orice cheie iese la client.
//  - la SCRIERE: cheile cunoscute → coloane; ORICE cheie necunoscută → înapoi în
//    `extra` (cu merge jsonb, nu overwrite). Deci nimic nu se pierde, nici măcar
//    chei viitoare pe care UI-ul nu le folosește.

export const STAGES = [
  "nou",
  "pe_viitor",
  "email",
  "mesaj",
  "onepager",
  "telefon",
  "online",
  "contract_trimis",
  "contract_semnat",
  "contract_asteptare",
  "contract_anulat",
  "sponsorizat",
] as const;

// stage → status derivat (invizibil tool-ului, pentru raportare corectă)
export function deriveStatus(stage: string): "open" | "won" | "lost" | "parked" {
  if (stage === "sponsorizat") return "won";
  if (stage === "contract_anulat") return "lost";
  if (stage === "pe_viitor") return "parked";
  return "open";
}

export function firstName(name: string | null | undefined): string {
  return (name || "").trim().split(/\s+/)[0] || "";
}
export function normName(s: string | null | undefined): string {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}
export type OwnerMaps = { byId: Record<string, string>; byFirst: Record<string, string> };
export function buildOwnerMaps(list: { id: string; name: string | null }[]): OwnerMaps {
  const byId: Record<string, string> = {};
  const byFirst: Record<string, string> = {};
  for (const u of list) {
    const fn = firstName(u.name);
    byId[u.id] = fn || u.name || "";
    if (fn) byFirst[normName(fn)] = u.id;
  }
  return { byId, byFirst };
}

// tool key → coloana Drizzle (camelCase din schema). 1:1 unde numele diferă doar
// prin snake_case în DB; câmpurile „speciale" (suma/status/responsabil/followup/
// contacte) sunt tratate separat mai jos.
const COL: Record<string, string> = {
  nume: "nume", cui: "cui", nrRegCom: "nrRegCom", judet: "judet",
  localitate: "localitate", adresa: "adresa", caen: "caen", industrie: "industrie",
  anInfiintare: "anInfiintare", site: "site", linkedin: "linkedin", facebook: "facebook",
  administrator: "administrator", ca: "ca", profit: "profit", profitTip: "profitTip",
  impozit: "impozit", nrAngajati: "nrAngajati", sursaFin: "sursaFin", anBilant: "anBilant",
  regimFiscal: "regimFiscal", sumaPropusa: "sumaPropusa", sumaSponsorizata: "sumaSponsorizata",
  recurent: "recurent", frecventa: "frecventa", campanie230: "campanie230",
  probability: "probability", nota: "nota", abordarePrin: "abordarePrin",
  stilAbordare: "stilAbordare", trimestre: "trimestre", istoric: "istoric",
  ong: "ong", media: "media",
};
// tratate separat, NU merg în `extra`
const SPECIAL = new Set(["id", "contacte", "responsabil", "suma", "sumaEst", "status", "followupAt"]);
// coloane care cer coerciție de tip (altfel un string rupe TOT PATCH-ul → pierdere)
const NUM_COLS = new Set([
  "ca", "profit", "impozit", "sumaPropusa", "sumaSponsorizata", "anInfiintare", "nrAngajati", "anBilant", "probability",
]);
const BOOL_COLS = new Set(["recurent", "campanie230"]);
const REGIM = new Set(["profit", "micro", "pierdere", "necunoscut"]);
// consimțământ: tool folosește ?/acord/dezabonat, DB folosește necunoscut/da/nu
export const CONSENT_TOOL2DB: Record<string, "da" | "nu" | "necunoscut"> = { acord: "da", dezabonat: "nu", "?": "necunoscut" };
export const CONSENT_DB2TOOL: Record<string, string> = { da: "acord", nu: "dezabonat", necunoscut: "?" };

type Row = Record<string, unknown>;
type Contact = Record<string, unknown>;
export type FlatCompany = Record<string, unknown>;

// ---- CITIRE: rând DB (+ contacte + prenume owner) → firmă plată pentru tool ----
export function rowToCompany(row: Row, contacts: Contact[], ownerFirst: string, idToName?: Record<string, string>): FlatCompany {
  const extra = (row.extra && typeof row.extra === "object" ? row.extra : {}) as Record<string, unknown>;
  const c: FlatCompany = { ...extra }; // chei de muncă ne-mapate întâi
  // coloane mapate (suprascriu extra pentru câmpurile normalizate)
  c.id = row.id;
  for (const [k, col] of Object.entries(COL)) c[k] = row[col];
  c.suma = row.sumaDisponibila;
  c.sumaEst = row.sumaEstimata;
  c.status = row.stage; // „status"-ul tool-ului = stage-ul
  c.followupAt = row.followupAt ? new Date(row.followupAt as string).getTime() : null;
  c.responsabil = ownerFirst || (extra.responsabilRaw as string) || "";
  if (extra.statusRaw) c.status = extra.statusRaw; // ex. „respins" păstrat identic
  c.updatedAt =
    (extra.updatedAt as number) ?? (row.updatedAt ? new Date(row.updatedAt as string).getTime() : undefined);
  c.contacte = (contacts || []).map((ct) => ({
    _cid: ct.id,
    nume: ct.nume, rol: ct.rol, dept: ct.dept, loc: ct.loc,
    email: ct.email, telefon: ct.telefon, linkedin: ct.linkedin,
    detalii: ct.detalii, cheie: ct.cheie,
    consentStatus: ct.consentStatus,
    consimtamant: CONSENT_DB2TOOL[ct.consentStatus as string] || "?",
    createdAt: ct.createdAt ? new Date(ct.createdAt as string).getTime() : null,
    createdByName: (ct.createdBy && idToName && idToName[ct.createdBy as string]) || "",
  }));
  return c;
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseInt(String(v).replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}

export type SplitCompany = {
  cols: Record<string, unknown>;
  extra: Record<string, unknown>;
  contacte: unknown[] | null;
};

// ---- SCRIERE: firmă plată din tool → { coloane, extraPatch, contacte } ----
export function companyToRow(c: FlatCompany, byFirst: Record<string, string>): SplitCompany {
  const cols: Record<string, unknown> = {};
  const extra: Record<string, unknown> = {};
  for (const k of Object.keys(c)) {
    if (k.startsWith("_")) continue;
    const col = COL[k];
    if (col !== undefined) {
      let v = c[k];
      if (NUM_COLS.has(col)) v = numOrNull(v);
      else if (BOOL_COLS.has(col)) v = !!v;
      else if (col === "regimFiscal" && v != null && !REGIM.has(String(v))) {
        extra.regimFiscalRaw = v; // valoare invalidă → nu crăpa enum-ul
        continue;
      }
      cols[col] = v;
    } else if (!SPECIAL.has(k)) {
      extra[k] = c[k];
    }
  }
  // chei de control DERIVATE — nu se acceptă din body (anti-spoofing); le setează logica
  delete extra.statusRaw;
  delete extra.responsabilRaw;
  // sume redenumite (coerciție → nu rupe PATCH-ul)
  cols.sumaDisponibila = numOrNull(c.suma);
  cols.sumaEstimata = !!c.sumaEst;
  // status(tool) = stage. Valorile din afara enum-ului (ex. „respins") NU ating
  // stage/status (le-am lăsa incoerente) — se păstrează doar în extra.statusRaw,
  // iar la citire ies înapoi identic.
  const st = c.status as string | undefined;
  if (st && (STAGES as readonly string[]).includes(st)) {
    cols.stage = st;
    cols.status = deriveStatus(st);
  } else if (st) {
    extra.statusRaw = st;
  }
  // responsabil (prenume) → owner_id. Dacă e gol SAU necunoscut, NU atingem
  // owner_id — altfel am șterge o atribuire (ex. când owner-ul are name null).
  const oid = byFirst[normName(c.responsabil as string)];
  if (oid) cols.ownerId = oid;
  else if (c.responsabil) extra.responsabilRaw = c.responsabil; // nume necunoscut: păstrează intenția, nu inventa owner
  // followupAt (epoch ms) → timestamptz
  if (c.followupAt != null && c.followupAt !== "") cols.followupAt = new Date(+(c.followupAt as number));
  else if ("followupAt" in c) cols.followupAt = null;

  return { cols, extra, contacte: Array.isArray(c.contacte) ? (c.contacte as unknown[]) : null };
}

// coloane editabile pe un contact (NU consimțământul — se atinge doar explicit)
export const CONTACT_COLS = ["nume", "rol", "dept", "loc", "email", "telefon", "linkedin", "detalii", "cheie"] as const;
