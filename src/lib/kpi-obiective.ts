// Config + tipuri pentru obiectivele organizației (lunare pe mecanism + anuale) și tendința pe 6 luni.
// Modul obișnuit (NU „use server"), importabil din server actions și din componentele client.
// Portat din panoul de echipă al CRM-ului Salvează o Inimă, generalizat: „realizat" vine din
// datele reale ale organizației (sponsorizări, apeluri, formulare 230), nu din contoare SOI.

export const OBI_MECANISME = [
  { key: "d177", label: "D177" },
  { key: "mec20", label: "20%" },
  { key: "f230", label: "Formular 230" },
] as const;
export type ObiMecanism = (typeof OBI_MECANISME)[number]["key"];

export const OBI_CAMPURI = [
  { key: "suma", label: "Sumă (RON)", bani: true },
  { key: "apeluri", label: "Apeluri", bani: false },
  { key: "inregistrari", label: "Sponsorizări / formulare", bani: false },
] as const;
export type ObiCamp = (typeof OBI_CAMPURI)[number]["key"];

// Doar suma pe Formular 230 se introduce manual (estimare — banii merg direct de la ANAF la ONG,
// nu trec prin CRM). Restul se calculează automat.
export function realizatManual(mec: ObiMecanism, camp: ObiCamp): boolean {
  return camp === "suma" && mec === "f230";
}
// Apelurile se înregistrează pe firme (D177/20%), nu pe formulare 230.
export function campAplicabil(mec: ObiMecanism, camp: ObiCamp): boolean {
  return !(mec === "f230" && camp === "apeluri");
}

export type ObiMecanismValori = Partial<Record<ObiCamp, number>>;
export type ObiLunar = Record<ObiMecanism, ObiMecanismValori>;
export type ObiMecFull = Record<ObiMecanism, Record<ObiCamp, number>>;
export type ObiAnual = { financiar?: number; firme?: number; formulare230?: number };

export type ObiectiveOrg = {
  luna: string; // YYYY-MM
  lunaLabel: string;
  an: string; // YYYY
  obiLunar: ObiLunar; // obiective lunare (editabile)
  obiAnual: ObiAnual; // obiective anuale (editabile)
  realManual: ObiLunar; // realizat MANUAL salvat pentru lună (doar suma 230)
  realizat: ObiMecFull; // realizat FINAL pe lună (auto + manual)
  realizatPrev: ObiMecFull; // luna precedentă (pentru ▲/▼)
  autoAnual: { financiar: number; firme: number; formulare230: number };
  pace: { lunarPct: number; anualPct: number; zileScurse: number; zileTotal: number };
};

export type TendintaOrg = {
  luni: string[]; // 6 × "YYYY-MM"
  serii: { cheie: string; label: string; bani?: boolean; valori: number[] }[];
};

export function pctDelta(acum: number, inainte: number): number | null {
  if (!inainte) return acum > 0 ? 100 : null;
  return Math.round(((acum - inainte) / inainte) * 100);
}

export function culoarePctObi(pct: number): string {
  if (pct >= 100) return "var(--ci-green)";
  if (pct >= 60) return "var(--ci-amber)";
  return "var(--ci-red)";
}

export function fmtRon(n: number): string {
  return `${Math.round(n).toLocaleString("ro-RO")} lei`;
}
