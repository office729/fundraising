// Export CSV al raportului: aceleași calcule ca pagina, cu antet care spune perioada, fusul orar, moneda, modelul și ultima actualizare.
// Funcții pure, fără importuri. Celulele care ar putea fi interpretate ca formule în Excel/Sheets sunt neutralizate.

// Un text care începe cu = + - @ sau cu tab/retur de car poate rula ca formulă la deschiderea în Excel: se prefixează cu apostrof.
export function celulaSigura(v: string | number | null): string {
  if (v === null) return "";
  const t = typeof v === "number" ? String(v) : v;
  const s = typeof v === "string" && /^[=+\-@\t\r]/.test(t) ? `'${t}` : t;
  return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const randCsv = (celule: (string | number | null)[]): string => celule.map(celulaSigura).join(",");

export type LinieExport = {
  platforma: string;
  campanie: string;
  codUtm: string | null;
  cheltuieliLei: number;
  donatii: number;
  brutLei: number;
  netLei: number;
  costPerDonatieLei: number | null;
  roasNet: number | null;
  donatoriNoi: number;
};

const lei = (bani: number): number => Math.round(bani) / 100;

export function construiesteCsv(meta: { perioada: string; fusOrar: string; moneda: string; model: string; fereastraZile: number; actualizat: string }, linii: LinieExport[]): string {
  const antet = [
    randCsv(["Performanța reclamelor"]),
    randCsv(["Perioada", meta.perioada]),
    randCsv(["Fus orar", meta.fusOrar]),
    randCsv(["Moneda", meta.moneda]),
    randCsv(["Model de atribuire", meta.model]),
    randCsv(["Fereastra de atribuire (zile)", meta.fereastraZile]),
    randCsv(["Ultima actualizare a costurilor", meta.actualizat]),
    "",
    randCsv(["Platformă", "Campanie", "Cod UTM", "Cheltuieli (lei)", "Donații confirmate atribuite", "Valoare brută (lei)", "Valoare netă (lei)", "Cost per donație (lei)", "ROAS net", "Donatori noi"]),
  ];
  const corp = linii.map((l) =>
    randCsv([l.platforma, l.campanie, l.codUtm, l.cheltuieliLei, l.donatii, l.brutLei, l.netLei, l.costPerDonatieLei, l.roasNet === null ? null : Math.round(l.roasNet * 100) / 100, l.donatoriNoi]),
  );
  return [...antet, ...corp].join("\r\n") + "\r\n";
}

export const baniInLei = lei;
