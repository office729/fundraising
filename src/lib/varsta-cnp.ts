// Calculează data nașterii (și vârsta) codată în CNP-ul românesc — folosit
// DOAR pentru filtrul pe vârstă din admin (Formularul 230), niciodată trimis
// mai departe/afișat ca atare. Prima cifră codează sexul + secolul; pentru
// rezidenți străini (7/8/9) codificarea nu e standard, întoarcem null.
const SECOL_DUPA_PRIMA_CIFRA: Record<string, number> = {
  "1": 1900, "2": 1900,
  "3": 1800, "4": 1800,
  "5": 2000, "6": 2000,
};

export function dataNasteriiDinCnp(cnp: string): Date | null {
  if (!/^\d{13}$/.test(cnp)) return null;
  const secol = SECOL_DUPA_PRIMA_CIFRA[cnp[0]];
  if (!secol) return null;
  const an = secol + Number(cnp.slice(1, 3));
  const luna = Number(cnp.slice(3, 5));
  const zi = Number(cnp.slice(5, 7));
  if (luna < 1 || luna > 12 || zi < 1 || zi > 31) return null;
  const data = new Date(Date.UTC(an, luna - 1, zi));
  // new Date rulează overflow silențios (ex. 31 feb → 3 mar) — verificăm că
  // data rezultată chiar corespunde cifrelor din CNP, altfel il respingem.
  if (data.getUTCFullYear() !== an || data.getUTCMonth() !== luna - 1 || data.getUTCDate() !== zi) return null;
  return data;
}

export function varstaDinCnp(cnp: string, laData: Date = new Date()): number | null {
  const nastere = dataNasteriiDinCnp(cnp);
  if (!nastere) return null;
  let varsta = laData.getUTCFullYear() - nastere.getUTCFullYear();
  const inaintePentruAniversare =
    laData.getUTCMonth() < nastere.getUTCMonth() ||
    (laData.getUTCMonth() === nastere.getUTCMonth() && laData.getUTCDate() < nastere.getUTCDate());
  if (inaintePentruAniversare) varsta -= 1;
  return varsta;
}

export type IntervalVarsta = "sub_18" | "18_30" | "31_45" | "46_60" | "peste_60";
export const INTERVALE_VARSTA: { key: IntervalVarsta; label: string; min: number; max: number | null }[] = [
  { key: "sub_18", label: "sub 18 ani", min: 0, max: 17 },
  { key: "18_30", label: "18–30 ani", min: 18, max: 30 },
  { key: "31_45", label: "31–45 ani", min: 31, max: 45 },
  { key: "46_60", label: "46–60 ani", min: 46, max: 60 },
  { key: "peste_60", label: "peste 60 ani", min: 61, max: null },
];

export function intervalVarsta(varsta: number | null): IntervalVarsta | null {
  if (varsta === null) return null;
  return INTERVALE_VARSTA.find((i) => varsta >= i.min && (i.max === null || varsta <= i.max))?.key ?? null;
}
