// Formatări comune pentru vederile CRM Persoane fizice.
export const nrRo = (n: number) => n.toLocaleString("ro-RO");
export const leiRo = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${Math.round(n).toLocaleString("ro-RO")} lei`);
export const procentRo = (p: number | null, zecimale = 0) => (p === null ? "—" : `${(p * 100).toFixed(zecimale).replace(".", ",")}%`);
export const dataRo = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" }) : "—";
export const dataOraRo = (iso: string) => new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
