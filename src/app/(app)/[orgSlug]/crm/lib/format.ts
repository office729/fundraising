import type { Locale } from "@/lib/i18n/config";

// Fus fix: fără el, serverul (UTC) și browserul (fusul local) afișau ore diferite — ora greșită pe pagini randate pe
// server și eroare de hidratare la componentele client care primesc o dată din baza de date.
const FUS = "Europe/Bucharest";

// Parametrul `locale` e opțional (implicit „ro”), ca apelanții existenți să rămână neschimbați.
function intl(locale: Locale) {
  return locale === "ro" ? "ro-RO" : "en-GB";
}

export function formatSuma(v: number, moneda: string = "RON", locale: Locale = "ro") {
  return new Intl.NumberFormat(intl(locale), { maximumFractionDigits: 0 }).format(v) + " " + moneda;
}

export function formatData(iso: string, locale: Locale = "ro") {
  return new Intl.DateTimeFormat(intl(locale), { day: "2-digit", month: "short", year: "numeric", timeZone: FUS }).format(new Date(iso));
}

export function formatDataOra(iso: string, locale: Locale = "ro") {
  return new Intl.DateTimeFormat(intl(locale), { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: FUS }).format(
    new Date(iso),
  );
}

export function formatDataRelativa(iso: string, locale: Locale = "ro") {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (locale === "en") {
    if (days === 0) return "today";
    if (days === 1) return "yesterday";
    if (days > 0 && days < 30) return `${days} days ago`;
    if (days < 0 && days > -30) return `in ${-days} days`;
    return formatData(iso, locale);
  }
  if (days === 0) return "azi";
  if (days === 1) return "ieri";
  if (days > 0 && days < 30) return `acum ${days} zile`;
  if (days < 0 && days > -30) return `în ${-days} zile`;
  return formatData(iso, locale);
}
