import type { Locale } from "@/lib/i18n/config";

// Formatări comune pentru vederile CRM Persoane fizice (numere, lei, procente, date), în limba curentă.
const eticheta = (locale: Locale) => (locale === "ro" ? "ro-RO" : "en-GB");

export function formatariPf(locale: Locale) {
  const tag = eticheta(locale);
  return {
    tag,
    nr: (n: number) => n.toLocaleString(tag),
    lei: (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${Math.round(n).toLocaleString(tag)} lei`),
    procent: (p: number | null, zecimale = 0) => (p === null ? "—" : `${(p * 100).toFixed(zecimale)}%`.replace(".", locale === "ro" ? "," : ".")),
    data: (iso: string | null | undefined) =>
      iso ? new Date(iso).toLocaleDateString(tag, { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" }) : "—",
    dataOra: (iso: string) => new Date(iso).toLocaleString(tag, { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
    // Formele scurte din fișa donatorului: „12 oct. 2026” / „12 Oct 2026”, cu fus fix (serverul e în UTC).
    dataScurta: (iso: string) => new Intl.DateTimeFormat(tag, { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Bucharest" }).format(new Date(iso)),
    dataOraScurta: (iso: string) =>
      new Intl.DateTimeFormat(tag, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }).format(new Date(iso)),
    relativa: (iso: string) => {
      const zile = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
      const ro = locale === "ro";
      if (zile === 0) return ro ? "azi" : "today";
      if (zile === 1) return ro ? "ieri" : "yesterday";
      if (zile > 0 && zile < 30) return ro ? `acum ${zile} zile` : `${zile} days ago`;
      if (zile < 0 && zile > -30) return ro ? `în ${-zile} zile` : `in ${-zile} days`;
      return new Intl.DateTimeFormat(tag, { day: "2-digit", month: "short", year: "numeric", timeZone: "Europe/Bucharest" }).format(new Date(iso));
    },
    dataOraCompleta: (iso: string) =>
      new Date(iso).toLocaleString(tag, { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }),
  };
}
