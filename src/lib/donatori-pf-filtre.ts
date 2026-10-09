// CRM Persoane fizice — partea pură (fără SQL), folosită și în browser: praguri, metadatele segmentelor, filtrele și (de)serializarea lor.

export const PRAGURI = {
  dormantLuni: 12, // „dormant”: nicio donație de atâtea luni
  valLuni: 6, // „ultimul val”, când nu există niciun import: ultimele N luni
  noiZile: 30, // „nou” când nu există niciun import: prima donație din ultimele N zile
  primaConvertitZile: 90, // „prima donație de convertit”: o singură donație din ultimele N zile
  candidatLunarMinDonatii: 3,
  riscMinDonatii: 3,
  riscDeLuni: 12, // risc de abandon: ultima donație acum 12–24 luni
  riscPanaLuni: 24,
  riscIntervalMaxZile: 270, // „dădea regulat”: în medie o donație la cel mult 9 luni
  topMic: 100,
  topMare: 10000,
  pagina: 100,
} as const;

export type SegmentMeta = { key: string; label: string; hint: string; grup: "donatii" | "lucru" | "recurenta" | "email"; top?: number };

export const SEGMENTE_META: SegmentMeta[] = [
  { key: "recurenti", label: "Recurenți", hint: "Au donat de cel puțin 2 ori", grup: "donatii" },
  { key: "unica", label: "O singură donație", hint: "Au donat o singură dată", grup: "donatii" },
  { key: "top100", label: "Top donatori", hint: `Primii ${PRAGURI.topMic} după suma totală, din ce rămâne după celelalte filtre`, grup: "donatii", top: PRAGURI.topMic },
  { key: "top10000", label: "Top 10.000", hint: `Primii ${PRAGURI.topMare.toLocaleString("ro-RO")} după suma totală, din ce rămâne după celelalte filtre`, grup: "donatii", top: PRAGURI.topMare },
  { key: "noi", label: "Noi", hint: "Apăruți la ultimul import (sau, fără importuri, cu prima donație în ultimele 30 de zile)", grup: "donatii" },
  { key: "aumaidonat", label: "Au mai donat", hint: "Au donat și în ultimul val, nu doar demult", grup: "donatii" },
  { key: "dormanti", label: "Dormanți", hint: `Nicio donație de peste ${PRAGURI.dormantLuni} luni — de reactivat`, grup: "donatii" },
  { key: "desunat", label: "De sunat", hint: "Au telefon și n-au fost sunați", grup: "lucru" },
  { key: "cutelefon", label: "Cu telefon", hint: "Au număr de telefon", grup: "lucru" },
  { key: "sunati", label: "Sunați", hint: "Au fost sunați", grup: "lucru" },
  { key: "multumiti", label: "Mulțumiți", hint: "Li s-a mulțumit", grup: "lucru" },
  { key: "lunari", label: "Donatori lunari", hint: "Au o donație lunară activă", grup: "recurenta" },
  { key: "candidatilunar", label: "Candidați lunar", hint: `${PRAGURI.candidatLunarMinDonatii}+ donații, dar nu sunt încă lunari`, grup: "recurenta" },
  { key: "winback", label: "Win-back", hint: "În proces de reactivare", grup: "recurenta" },
  { key: "risc", label: "Risc de abandon", hint: "Recurenți care dădeau regulat, dar s-au oprit de 1–2 ani", grup: "recurenta" },
  { key: "primadeconvertit", label: "Prima donație de convertit", hint: "O singură donație, recentă — de contactat cât e „cald”", grup: "recurenta" },
  { key: "consimtemail", label: "Consimțământ email", hint: "Au consimțământ pentru email și nu sunt dezabonați", grup: "email" },
  { key: "abonati", label: "Abonați newsletter", hint: "Pot primi emailuri de campanie", grup: "email" },
  { key: "dezabonati", label: "Dezabonați newsletter", hint: "S-au dezabonat de la emailurile de campanie", grup: "email" },
];
export const CHEI_SEGMENTE = new Set(SEGMENTE_META.map((s) => s.key));

export const CAMPURI_DATA = ["activitate", "adaugat", "sunat", "multumit"] as const;
export type CampData = (typeof CAMPURI_DATA)[number];
export const ETICHETE_CAMP_DATA: Record<CampData, string> = { activitate: "Activitate (o donație)", adaugat: "Adăugat în CRM", sunat: "Sunat", multumit: "Mulțumit" };
export const SORTARI = ["email", "nume", "localitate", "total", "nr", "ultima_suma", "ultima", "primul_proiect", "ultimul_proiect", "an"] as const;
export type Sortare = (typeof SORTARI)[number];

export type FiltruPf = {
  q: string;
  pagina: number;
  seg: string[]; // chei de segmente, combinate cu ȘI
  an: number | null; // anul primei donații (cohortă)
  proiect: string; // a donat vreodată pentru acest proiect (nume)
  primProiect: string; // primul proiect
  judet: string;
  localitate: string;
  pentruCine: string; // text liber din numele proiectelor
  sumaMin: number | null; // total donat
  sumaMax: number | null;
  ultimaMin: number | null; // valoarea ultimei donații
  campData: CampData;
  dataDe: string;
  dataPana: string;
  primaDe: string;
  primaPana: string;
  sort: Sortare;
  dir: "asc" | "desc";
};

const DATA_ISO = /^\d{4}-\d{2}-\d{2}$/;
const dataOk = (v: string | null) => (v && DATA_ISO.test(v) ? v : "");
const numarOk = (v: string | null) => {
  if (v == null || v.trim() === "") return null;
  const n = Number(v.replace(",", "."));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

export function parseFiltruPf(sp: URLSearchParams): FiltruPf {
  const sort = SORTARI.find((s) => s === sp.get("sort")) ?? "ultima";
  const camp = CAMPURI_DATA.find((c) => c === sp.get("campData")) ?? "activitate";
  const an = Number(sp.get("an"));
  return {
    q: (sp.get("q") ?? "").slice(0, 120),
    pagina: Math.max(1, Math.min(100000, Number(sp.get("pagina")) || 1)),
    seg: (sp.get("seg") ?? "").split(",").filter((k) => CHEI_SEGMENTE.has(k)),
    an: Number.isInteger(an) && an >= 1990 && an <= 2100 ? an : null,
    proiect: (sp.get("proiect") ?? "").slice(0, 200),
    primProiect: (sp.get("primProiect") ?? "").slice(0, 200),
    judet: (sp.get("judet") ?? "").slice(0, 100),
    localitate: (sp.get("localitate") ?? "").slice(0, 100),
    pentruCine: (sp.get("pentruCine") ?? "").slice(0, 200),
    sumaMin: numarOk(sp.get("sumaMin")),
    sumaMax: numarOk(sp.get("sumaMax")),
    ultimaMin: numarOk(sp.get("ultimaMin")),
    campData: camp,
    dataDe: dataOk(sp.get("dataDe")),
    dataPana: dataOk(sp.get("dataPana")),
    primaDe: dataOk(sp.get("primaDe")),
    primaPana: dataOk(sp.get("primaPana")),
    sort,
    dir: sp.get("dir") === "asc" ? "asc" : "desc",
  };
}

export function filtruLaParametri(f: Partial<FiltruPf>): URLSearchParams {
  const sp = new URLSearchParams();
  const pune = (k: string, v: unknown) => {
    if (v !== "" && v !== null && v !== undefined) sp.set(k, String(v));
  };
  pune("q", f.q);
  if (f.seg?.length) sp.set("seg", f.seg.join(","));
  pune("an", f.an);
  pune("proiect", f.proiect);
  pune("primProiect", f.primProiect);
  pune("judet", f.judet);
  pune("localitate", f.localitate);
  pune("pentruCine", f.pentruCine);
  pune("sumaMin", f.sumaMin);
  pune("sumaMax", f.sumaMax);
  pune("ultimaMin", f.ultimaMin);
  if (f.campData && f.campData !== "activitate") sp.set("campData", f.campData);
  pune("dataDe", f.dataDe);
  pune("dataPana", f.dataPana);
  pune("primaDe", f.primaDe);
  pune("primaPana", f.primaPana);
  if (f.sort && f.sort !== "ultima") sp.set("sort", f.sort);
  if (f.dir === "asc") sp.set("dir", "asc");
  return sp;
}

// Câte filtre (în afara căutării și segmentelor) sunt active — pentru insigna butonului „Filtre”.
export function numarFiltreActive(f: FiltruPf): number {
  return [f.an, f.proiect, f.primProiect, f.judet, f.localitate, f.pentruCine, f.sumaMin, f.sumaMax, f.ultimaMin, f.dataDe, f.dataPana, f.primaDe, f.primaPana].filter((v) => v !== "" && v !== null).length;
}
