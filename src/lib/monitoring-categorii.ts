// Funcții pure pentru monitorizare (fără importuri, ca să se poată testa direct).

// Zonele din Sentry (eticheta `zona`) nu urmează un singur prefix: „donatie-express", „portal-donator-card", „retentie", „performanta-automatizari"
// nu se potriveau cu regulile de alertă documentate (netopia-*, stripe-*, oblio-*, cron-*, gdpr-*), deci erori pe căi care mută bani sau rulează
// zilnic nu declanșau nimic. Eticheta `categorie` se deduce din zonă, într-un singur loc, iar regulile de alertă se pun pe ea:
//   plati   — tot ce ține de bani (abonament Netopia, donații Stripe/Revolut/PayPal, facturi Oblio, portalul donatorului)
//   cron    — lucrări programate (remindere, retenție, statistici, rezumate)
//   altele  — restul (AI, PDF, import, invitații etc.)
const PLATI = /^(netopia|stripe|oblio|donatie|portal-donator|alerta-operator)(-|$)/;
const CRON = /^(cron|gdpr|retentie|performanta|statistici-campanii|granturi|calendar|voluntari|formular230|rate-limit|organizatie)(-|$)/;

export type CategorieZona = "plati" | "cron" | "altele";

export function categorieZona(zona: string): CategorieZona {
  if (PLATI.test(zona)) return "plati";
  if (CRON.test(zona)) return "cron";
  return "altele";
}

// Limitare simplă pentru avertismentele provocate de cereri externe (IPN/webhook respins): un scanner care lovește un endpoint public nu are
// voie să consume cota Sentry. `memorie` ține momentul ultimei raportări pe cheie; întoarce true doar dacă a trecut `intervalMs`.
export function trebuieRaportat(memorie: Map<string, number>, cheie: string, acum: number, intervalMs: number): boolean {
  const ultima = memorie.get(cheie);
  if (ultima !== undefined && acum - ultima < intervalMs) return false;
  memorie.set(cheie, acum);
  if (memorie.size > 200) {
    for (const [k, t] of memorie) if (acum - t >= intervalMs) memorie.delete(k);
  }
  return true;
}
