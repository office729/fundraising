// Pre-lansarea site-ului: cronometru pe prima pagină până pe 25 octombrie 2026, ora 00:00 (ora României); ziua de 25 e deschisă doar administratorilor
// platformei; de pe 26 octombrie 2026, ora 00:00, site-ul e live pentru toți. Fără importuri, ca să se poată folosi în proxy și în teste.
//
// Atenție la fusul orar: în România ora de vară se termină pe 25 octombrie 2026 la 04:00 (ceasurile se dau înapoi). La 25 octombrie 00:00 e încă ora de vară
// (UTC+3), iar la 26 octombrie 00:00 e deja ora de iarnă (UTC+2); de aceea cele două momente au offset-uri diferite.

export const CRONOMETRU_PANA_ISO = "2026-10-25T00:00:00+03:00";
export const LIVE_DE_LA_ISO = "2026-10-26T00:00:00+02:00";
export const CRONOMETRU_PANA_MS = Date.parse(CRONOMETRU_PANA_ISO);
export const LIVE_DE_LA_MS = Date.parse(LIVE_DE_LA_ISO);

export type StarePrelansare = "numaratoare" | "ajun" | "live";

// `oprita`: întrerupător de urgență (variabila PRELANSARE_OPRITA=1 pe Vercel) care deschide site-ul pentru toți, fără o nouă publicare.
export function starePrelansare(acumMs: number, oprita = false): StarePrelansare {
  if (oprita || acumMs >= LIVE_DE_LA_MS) return "live";
  return acumMs >= CRONOMETRU_PANA_MS ? "ajun" : "numaratoare";
}

// Momentul spre care numără cronometrul: lansarea de pe 25 la 00:00; după ce a trecut, deschiderea pentru toți, pe 26 la 00:00.
export function tintaCronometru(stare: StarePrelansare): number {
  return stare === "numaratoare" ? CRONOMETRU_PANA_MS : LIVE_DE_LA_MS;
}

export type TimpRamas = { zile: number; ore: number; minute: number; secunde: number; total: number };

export function descompune(msRamase: number): TimpRamas {
  const total = Math.max(0, Math.floor(msRamase / 1000));
  return { zile: Math.floor(total / 86_400), ore: Math.floor((total % 86_400) / 3600), minute: Math.floor((total % 3600) / 60), secunde: total % 60, total };
}

// Paginile comerciale ale site-ului, închise publicului până la lansare. Rămân deschise mereu: autentificarea (clienții existenți), paginile de donație și
// Formularul 230 ale organizațiilor, widgetul, webhook-urile și cron-urile, textele legale, contactul și linkurile de invitație.
const CALE_INCHISE = new Set([
  "/",
  "/hub",
  "/signup",
  "/cine-suntem",
  "/ce-facem",
  "/intrebari-frecvente",
  "/previzualizare-campanii",
  "/portofoliu",
  "/portofoliu-clienti",
  "/premii",
  "/vlad-placinta",
  "/automatizare",
  "/automatizari",
  "/cum-functioneaza",
  "/studii-de-caz",
]);

export function esteCaleInchisaPublicului(cale: string, areInvitatie = false): boolean {
  const c = cale.length > 1 ? cale.replace(/\/+$/, "") : cale;
  // Înscrierea cu invitație (?invite= / ?beneficiarInvite=) aparține clienților existenți care își adaugă colegi: rămâne deschisă.
  if (c === "/signup" && areInvitatie) return false;
  return CALE_INCHISE.has(c) || c === "/blog" || c.startsWith("/blog/");
}
