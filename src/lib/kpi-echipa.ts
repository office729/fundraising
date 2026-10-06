// KPI de echipă — config + calcule pure (fără acces la DB), importabile atât din
// server actions, cât și din componentele client. Portat din panoul de echipă al
// CRM-ului Salvează o Inimă, generalizat pentru orice organizație: metricile automate
// vin din activitatea reală din CRM (cine a făcut ce), cele manuale au contor „+1".

export const KPI_METRICE = ["companii", "contacte", "apeluri", "sponsorizari", "notite", "etape", "linkuri", "emailuri", "intalniri"] as const;
export type KpiMetric = (typeof KPI_METRICE)[number];

export const KPI_LABEL: Record<KpiMetric, string> = {
  companii: "Companii lucrate",
  contacte: "Contacte adăugate",
  apeluri: "Apeluri",
  sponsorizari: "Sponsorizări înregistrate",
  notite: "Notițe",
  etape: "Mutări în pipeline",
  linkuri: "Firme cu LinkedIn / Facebook adăugat",
  emailuri: "Emailuri trimise",
  intalniri: "Întâlniri",
};

// Metrici FĂRĂ sursă automată de date → realizatul vine dintr-un contor manual
// („+1" din „KPI-ul meu"), stocat în crm_kv 'kpi_log'.
export const KPI_MANUAL: KpiMetric[] = ["emailuri", "intalniri"];
export function esteManualKpi(m: string): m is KpiMetric {
  return (KPI_MANUAL as string[]).includes(m);
}

// Baza de referință pentru scalarea țintei lunare pe o perioadă (zile lucrătoare L–V).
export const ZILE_LUCRATOARE_LUNA = 21;

export type KpiRow = {
  id: string;
  nume: string;
  realizat: Record<KpiMetric, number>;
  tintaLunara: Partial<Record<KpiMetric, number>>;
};
export type KpiEchipa = {
  perioada: { de: string; la: string };
  eArbitrara: boolean; // true dacă utilizatorul a ales manual intervalul (altfel = luna curentă)
  zileLucratoare: number;
  bazaLunara: number;
  rows: KpiRow[];
};

export type KpiPersonalMetric = {
  cheie: KpiMetric;
  label: string;
  manual: boolean;
  azi: number;
  sapt: number;
  luna: number;
  an: number;
  tintaZi: number | null;
  tintaSapt: number | null;
  tintaLuna: number | null;
  tintaAn: number | null;
};
export type KpiPersonal = {
  nume: string;
  lunaLabel: string;
  an: string;
  paceSaptPct: number;
  paceLunaPct: number;
  paceAnPct: number;
  areTinte: boolean;
  metrice: KpiPersonalMetric[];
};

// Ținta scalată la perioada aleasă: țintă_lunară × zileLucrătoare / baza lunii (rotunjit).
export function tintaPerioada(tintaLunara: number, zileLucratoare: number, bazaLunara = ZILE_LUCRATOARE_LUNA): number {
  return Math.max(0, Math.round((tintaLunara * zileLucratoare) / (bazaLunara || ZILE_LUCRATOARE_LUNA)));
}

// ===== Zile lucrătoare (fără weekend + fără sărbători legale RO) =====
// Paștele ortodox: algoritmul Meeus (dată iuliană) + 13 zile → gregoriană (valabil 1900–2099).
function pasteOrtodox(an: number): Date {
  const a = an % 4,
    b = an % 7,
    c = an % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const luna = Math.floor((d + e + 114) / 31);
  const zi = ((d + e + 114) % 31) + 1;
  const iulian = new Date(Date.UTC(an, luna - 1, zi));
  iulian.setUTCDate(iulian.getUTCDate() + 13);
  return iulian;
}
function isoUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}
const _sarbCache = new Map<number, Set<string>>();
export function sarbatoriRo(an: number): Set<string> {
  const c = _sarbCache.get(an);
  if (c) return c;
  const s = new Set<string>([
    `${an}-01-01`, `${an}-01-02`, `${an}-01-24`,
    `${an}-05-01`, `${an}-06-01`,
    `${an}-08-15`, `${an}-11-30`, `${an}-12-01`,
    `${an}-12-25`, `${an}-12-26`,
  ]);
  const paste = pasteOrtodox(an);
  for (const off of [-2, 0, 1, 49, 50]) {
    const d = new Date(paste);
    d.setUTCDate(d.getUTCDate() + off);
    s.add(isoUTC(d));
  }
  _sarbCache.set(an, s);
  return s;
}

// Zile lucrătoare între de..la inclusiv: L–V, fără sâmbete/duminici și fără sărbători legale.
export function numaraZileLucratoare(de: string, la: string): number {
  let n = 0;
  const d = new Date(de + "T12:00:00");
  const end = new Date(la + "T12:00:00");
  while (d <= end) {
    const zi = d.getDay();
    const iso = isoUTC(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())));
    if (zi >= 1 && zi <= 5 && !sarbatoriRo(d.getFullYear()).has(iso)) n += 1;
    d.setDate(d.getDate() + 1);
  }
  return n;
}
