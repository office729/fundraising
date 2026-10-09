import { sarbatoriRo } from "@/lib/kpi-echipa";

// Echipă & Performanță — regulile de măsurare, fără acces la baza de date (importabile și din browser, și în teste).
// Păstrează DISTINCTE patru lucruri: realizarea numerică (progres), starea față de ritm (în grafic / în risc / întârziat),
// încrederea responsabilului și actualitatea datelor. Lipsa datelor NU înseamnă zero.

export type Metoda = "crescator" | "descrescator" | "interval" | "binar";
export type TipTinta = "cumulativ" | "periodic";
export type Incredere = "mare" | "medie" | "scazuta";
export type FrecventaActualizare = "zilnic" | "saptamanal" | "lunar" | "trimestrial";
export type StareRitm = "neinceput" | "fara_date" | "in_grafic" | "in_risc" | "intarziat" | "finalizat" | "anulat";
export type Actualitate = "la_zi" | "intarziata" | "veche" | "fara_date";

export const METODE: { id: Metoda; eticheta: string; explicatie: string }[] = [
  { id: "crescator", eticheta: "Cât mai mult", explicatie: "O valoare mai mare e mai bună (încasări, donatori noi)." },
  { id: "descrescator", eticheta: "Cât mai puțin", explicatie: "O valoare mai mică e mai bună (neconcordanțe, întârzieri)." },
  { id: "interval", eticheta: "Într-un interval", explicatie: "Valoarea trebuie să rămână între două limite (rată de răspuns, încărcare)." },
  { id: "binar", eticheta: "Realizat / nerealizat", explicatie: "Se realizează sau nu (raport predat, campanie lansată)." },
];

export const PRAG_IN_GRAFIC = 0.9; // progres / ritm așteptat
export const PRAG_IN_RISC = 0.6;
const EPS = 1e-9;

export type DateMasurare = {
  metoda: Metoda;
  nivelInitial: number | null;
  tinta: number | null;
  tintaMax?: number | null; // pentru „interval”: tinta = limita de jos, tintaMax = limita de sus
  valoare: number | null;
};

export type RezultatProgres = {
  progres: number | null; // 0..∞ (peste 1 = țintă depășită); null = nu se poate calcula
  motiv: "ok" | "fara_date" | "tinta_lipsa";
  avertisment: string | null;
  peste: boolean;
  regres: boolean; // mai rău decât nivelul inițial
};

const nul = (motiv: RezultatProgres["motiv"]): RezultatProgres => ({ progres: null, motiv, avertisment: null, peste: false, regres: false });
const ok = (progres: number, avertisment: string | null = null, regres = false): RezultatProgres => ({ progres, motiv: "ok", avertisment, peste: progres > 1 + EPS, regres });

// Progresul unui rezultat-cheie, după metoda lui. Date lipsă => null (nu 0). Numitor zero și țintă zero sunt tratate explicit.
export function progresRezultat(d: DateMasurare): RezultatProgres {
  if (d.valoare === null || d.valoare === undefined || Number.isNaN(d.valoare)) return nul("fara_date");
  if (d.tinta === null || d.tinta === undefined) return nul("tinta_lipsa");
  const v = d.valoare;
  const t = d.tinta;

  if (d.metoda === "binar") return ok(v >= 1 ? 1 : 0);

  if (d.metoda === "interval") {
    const jos = Math.min(t, d.tintaMax ?? t);
    const sus = Math.max(t, d.tintaMax ?? t);
    if (v >= jos - EPS && v <= sus + EPS) return ok(1);
    const distanta = v < jos ? jos - v : v - sus;
    const toleranta = Math.max(sus - jos, Math.abs((jos + sus) / 2) * 0.25, EPS);
    return ok(Math.max(0, 1 - distanta / toleranta), jos === sus ? "Interval fără lățime: se evaluează doar valoarea exactă." : null);
  }

  if (d.metoda === "crescator") {
    const init = d.nivelInitial ?? 0;
    const numitor = t - init;
    if (Math.abs(numitor) < EPS) return ok(v >= t - EPS ? 1 : 0, "Ținta este egală cu nivelul inițial: se evaluează doar atinsă / neatinsă.");
    const brut = (v - init) / numitor;
    return ok(Math.max(0, brut), numitor < 0 ? "Ținta e sub nivelul inițial: verifică metoda („Cât mai puțin”?)." : null, brut < 0);
  }

  // descrescator
  if (d.nivelInitial === null || d.nivelInitial === undefined) {
    return ok(v <= t + EPS ? 1 : 0, "Fără nivel inițial: se evaluează doar atinsă / neatinsă.");
  }
  const numitor = d.nivelInitial - t;
  if (Math.abs(numitor) < EPS) return ok(v <= t + EPS ? 1 : 0, "Ținta este egală cu nivelul inițial: se evaluează doar atinsă / neatinsă.");
  const brut = (d.nivelInitial - v) / numitor;
  return ok(Math.max(0, brut), numitor < 0 ? "Ținta e peste nivelul inițial: verifică metoda („Cât mai mult”?)." : null, brut < 0);
}

// Progresul unui obiectiv = media ponderată a rezultatelor-cheie ACTIVE care au date, fiecare plafonat la 100%
// (depășirea unuia nu maschează rămânerea în urmă a altuia). Fără date nicăieri => null.
export function progresObiectiv(rks: { progres: number | null; pondere: number; activ?: boolean }[]): { progres: number | null; cuDate: number; total: number } {
  const active = rks.filter((r) => r.activ !== false);
  const cuDate = active.filter((r) => r.progres !== null);
  if (cuDate.length === 0) return { progres: null, cuDate: 0, total: active.length };
  const w = cuDate.reduce((s, r) => s + Math.max(1, r.pondere), 0);
  const p = cuDate.reduce((s, r) => s + Math.min(1, r.progres ?? 0) * Math.max(1, r.pondere), 0) / w;
  return { progres: p, cuDate: cuDate.length, total: active.length };
}

// ===== Ritm =====
const ziMs = 86_400_000;
const dinIso = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

// Cât din perioadă ar trebui să fie realizat (0..1) la sfârșitul zilei de azi — ritmul liniar așteptat al unei ținte cumulative.
export function ritmAsteptat(start: string, end: string, azi: string): number {
  const s = dinIso(start);
  const e = dinIso(end) + ziMs; // sfârșitul zilei de final
  const a = dinIso(azi);
  if (e <= s) return 1;
  return Math.min(1, Math.max(0, (a - s + ziMs) / (e - s)));
}

export function stareRitm(p: { progres: number | null; start: string; end: string; azi: string; status?: "activ" | "finalizat" | "anulat" }): StareRitm {
  if (p.status === "anulat") return "anulat";
  if (p.status === "finalizat") return "finalizat";
  if (p.progres === null) return p.azi < p.start ? "neinceput" : "fara_date";
  if (p.progres >= 1 - EPS) return "finalizat";
  if (p.azi > p.end) return "intarziat";
  const asteptat = ritmAsteptat(p.start, p.end, p.azi);
  // În primele zile ale perioadei (ritm sub 5%) nu alarmăm: nu există încă un ritm de comparat.
  const raport = asteptat <= 0.05 ? 1 : p.progres / asteptat;
  return raport >= PRAG_IN_GRAFIC ? "in_grafic" : raport >= PRAG_IN_RISC ? "in_risc" : "intarziat";
}

export const ETICHETE_STARE: Record<StareRitm, string> = {
  neinceput: "Neînceput",
  fara_date: "Fără date",
  in_grafic: "În grafic",
  in_risc: "În risc",
  intarziat: "Întârziat",
  finalizat: "Atins",
  anulat: "Anulat",
};

// ===== Actualitatea datelor =====
const ZILE_PERMISE: Record<FrecventaActualizare, number> = { zilnic: 2, saptamanal: 9, lunar: 35, trimestrial: 100 };

export function actualitateDate(ultima: Date | string | null | undefined, frecventa: FrecventaActualizare, acum: Date = new Date()): Actualitate {
  if (!ultima) return "fara_date";
  const t = typeof ultima === "string" ? Date.parse(ultima) : ultima.getTime();
  if (Number.isNaN(t)) return "fara_date";
  const zile = (acum.getTime() - t) / ziMs;
  const perm = ZILE_PERMISE[frecventa] ?? 9;
  return zile <= perm ? "la_zi" : zile <= perm * 2 ? "intarziata" : "veche";
}
export const ETICHETE_ACTUALITATE: Record<Actualitate, string> = { la_zi: "La zi", intarziata: "Actualizare întârziată", veche: "Date vechi", fara_date: "Fără actualizări" };
export const ETICHETE_INCREDERE: Record<Incredere, string> = { mare: "Încredere mare", medie: "Încredere medie", scazuta: "Încredere scăzută" };

// ===== Perioade =====
// Ziua de azi în România (YYYY-MM-DD): toate comparațiile cu termene se fac pe ziua calendaristică locală, nu pe UTC.
export const aziRo = (acum: Date = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(acum);

export type Trimestru = { cod: string; start: string; end: string; eticheta: string };
const LUNI_SCURT = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"];

export function trimestruDin(azi: string, decalaj = 0): Trimestru {
  const an = Number(azi.slice(0, 4));
  const luna = Number(azi.slice(5, 7)) - 1;
  const idx = an * 4 + Math.floor(luna / 3) + decalaj;
  const a = Math.floor(idx / 4);
  const q = idx % 4;
  const startLuna = q * 3;
  const ultimaZi = new Date(Date.UTC(a, startLuna + 3, 0)).getUTCDate();
  const p2 = (n: number) => String(n).padStart(2, "0");
  return {
    cod: `${a}-T${q + 1}`,
    start: `${a}-${p2(startLuna + 1)}-01`,
    end: `${a}-${p2(startLuna + 3)}-${p2(ultimaZi)}`,
    eticheta: `T${q + 1} ${a} (${LUNI_SCURT[startLuna]}–${LUNI_SCURT[startLuna + 2]})`,
  };
}

// ===== Capacitate =====
export const ORE_PE_ZI = 8;
const adaugaZile = (iso: string, n: number) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const luniSaptamanii = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return adaugaZile(iso, -((d.getUTCDay() + 6) % 7));
};

export type Absenta = { start: string; end: string };

// Capacitatea unei săptămâni (de luni): zile lucrătoare minus sărbători minus absențe, înmulțite cu norma.
export function capacitateSaptamana(p: { luni: string; normaProcent: number; absente: Absenta[] }): { ore: number; zileLucratoare: number; zileAbsente: number } {
  let lucratoare = 0;
  let absente = 0;
  for (let i = 0; i < 5; i++) {
    const zi = adaugaZile(p.luni, i);
    if (sarbatoriRo(Number(zi.slice(0, 4))).has(zi)) continue;
    lucratoare++;
    if (p.absente.some((a) => zi >= a.start && zi <= a.end)) absente++;
  }
  const zileEfective = Math.max(0, lucratoare - absente);
  return { ore: zileEfective * ORE_PE_ZI * (Math.max(0, p.normaProcent) / 100), zileLucratoare: lucratoare, zileAbsente: absente };
}

export type ActivitateIncarcare = { termen: string | null; efortOre: number | null; status: string };

// Încărcarea unei săptămâni: efortul estimat al activităților deschise cu termenul în săptămână, plus restanțele (la săptămâna curentă).
export function incarcareSaptamana(activitati: ActivitateIncarcare[], luni: string, esteSaptamanaCurenta: boolean): { ore: number; fara_estimare: number; nr: number } {
  const duminica = adaugaZile(luni, 6);
  let ore = 0;
  let fara = 0;
  let nr = 0;
  for (const a of activitati) {
    if (!a.termen || a.status === "finalizat" || a.status === "anulat") continue;
    const inSaptamana = a.termen >= luni && a.termen <= duminica;
    const restanta = esteSaptamanaCurenta && a.termen < luni;
    if (!inSaptamana && !restanta) continue;
    nr++;
    if (a.efortOre === null || a.efortOre === undefined) fara++;
    else ore += a.efortOre;
  }
  return { ore, fara_estimare: fara, nr };
}

export type NivelIncarcare = "indisponibil" | "liber" | "echilibrat" | "plin" | "suprasolicitat";
export function nivelIncarcare(ore: number, capacitateOre: number): NivelIncarcare {
  if (capacitateOre <= EPS) return ore > 0 ? "indisponibil" : "liber";
  const r = ore / capacitateOre;
  return r < 0.5 ? "liber" : r < 0.9 ? "echilibrat" : r <= 1.1 ? "plin" : "suprasolicitat";
}
export const ETICHETE_INCARCARE: Record<NivelIncarcare, string> = { indisponibil: "Indisponibil", liber: "Disponibil", echilibrat: "Echilibrat", plin: "Plin", suprasolicitat: "Suprasolicitat" };
