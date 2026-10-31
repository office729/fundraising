import type { Locale } from "@/lib/i18n/config";
import { RECLAME_UI_DICT } from "@/lib/i18n/dictionaries/reclame-ui";

// Formatări din „Performanța reclamelor”, după limba platformei. Aceleași reguli ca în src/lib/reclame/calcule.ts
// (sumele sunt în bani / unități minore), dar cu separatori și monedă pe limbă; biblioteca rămâne neatinsă.
export function formatariReclame(locale: Locale) {
  const loc = locale === "ro" ? "ro-RO" : "en-GB";
  const moneda = RECLAME_UI_DICT[locale].moneda;
  const nf = (zecimale: number) => new Intl.NumberFormat(loc, { minimumFractionDigits: zecimale, maximumFractionDigits: zecimale });
  return {
    loc,
    moneda,
    lei: (bani: number | null, zecimale = 2): string => (bani === null ? "—" : `${nf(zecimale).format(bani / 100)} ${moneda}`),
    roas: (x: number | null): string => (x === null ? "—" : `${nf(2).format(x)}×`),
    numar: (n: number | null): string => (n === null ? "—" : nf(0).format(n)),
    procent: (x: number | null): string => (x === null ? "—" : `${nf(1).format(x)}%`),
    // Cu zecimale fixe, pentru sume nemarcate cu monedă (ex. totalul din fișier, în moneda lui).
    decimal: (valoare: number, zecimale = 2): string => nf(zecimale).format(valoare),
    // „YYYY-MM-DD” (zi calendaristică, fără fus).
    zi: (iso: string): string => new Date(`${iso}T00:00:00Z`).toLocaleDateString(loc, { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }),
    // Moment în timp (ISO), data în ora României.
    data: (iso: string): string => new Date(iso).toLocaleDateString(loc, { timeZone: "Europe/Bucharest", day: "numeric", month: "short", year: "numeric" }),
    dataOra: (iso: string): string => new Date(iso).toLocaleString(loc, { timeZone: "Europe/Bucharest", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
  };
}

export type FormatariReclame = ReturnType<typeof formatariReclame>;
