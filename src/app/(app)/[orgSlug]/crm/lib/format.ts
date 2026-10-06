// Fus fix: fără el, serverul (UTC) și browserul (fusul local) afișau ore diferite — ora greșită pe pagini randate pe
// server și eroare de hidratare la componentele client care primesc o dată din baza de date.
const FUS = "Europe/Bucharest";

export function formatSuma(v: number, moneda: string = "RON") {
  return new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 0 }).format(v) + " " + moneda;
}

export function formatData(iso: string) {
  return new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short", year: "numeric", timeZone: FUS }).format(new Date(iso));
}

export function formatDataOra(iso: string) {
  return new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: FUS }).format(
    new Date(iso),
  );
}

export function formatDataRelativa(iso: string) {
  const days = Math.round((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return "azi";
  if (days === 1) return "ieri";
  if (days > 0 && days < 30) return `acum ${days} zile`;
  if (days < 0 && days > -30) return `în ${-days} zile`;
  return formatData(iso);
}
