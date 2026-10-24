// Pre-lansarea site-ului: cronometru pe prima pagină până la lansare, pe 26 octombrie 2026, ora 06:00 (ora României); de atunci site-ul e live pentru toți.
// Până atunci doar administratorii platformei văd site-ul real. Fără importuri, ca să se poată folosi în proxy și în teste.
//
// Atenție la fusul orar: în România ora de vară se termină pe 25 octombrie 2026 la 04:00 (ceasurile se dau înapoi), deci la 26 octombrie e ora de iarnă (UTC+2).

export const LIVE_DE_LA_ISO = "2026-10-26T06:00:00+02:00";
export const LIVE_DE_LA_MS = Date.parse(LIVE_DE_LA_ISO);

export type StarePrelansare = "numaratoare" | "live";

// `oprita`: întrerupător de urgență (variabila PRELANSARE_OPRITA=1 pe Vercel) care deschide site-ul pentru toți, fără o nouă publicare.
export function starePrelansare(acumMs: number, oprita = false): StarePrelansare {
  if (oprita || acumMs >= LIVE_DE_LA_MS) return "live";
  return "numaratoare";
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
