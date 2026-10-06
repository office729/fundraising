import "server-only";

import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { esteAbonamentPlatit, isPlatformAdmin } from "@/lib/billing/trial";

// Plafon zilnic de generări AI pe organizație (cost Anthropic): fără el, un cont
// de probă gratuită poate genera nelimitat pe contul platformei. O „generare" =
// o acțiune pornită de utilizator (un apel care poate cheama modelul de mai multe
// ori, de ex. cele 6 canale de conținut). Valorile sunt generoase — un utilizator
// normal nu le atinge; ajustează aici dacă e nevoie.
const LIMITA_ZILNICA_PROBA = 30;
const LIMITA_ZILNICA_PLATIT = 300;

export const MESAJ_LIMITA_AI = "Ai atins limita zilnică de generări AI pentru organizația ta. Încearcă din nou mâine.";

// true = limita a fost depășită (apelantul întoarce MESAJ_LIMITA_AI în forma lui
// de eroare). Contorul crește la fiecare apel, deci se pune DUPĂ verificările
// de intrare (pagina găsită, AI configurat) și ÎNAINTE de apelul către model.
export async function limitaAIDepasita(ctx: {
  orgId: string;
  userEmail: string;
  orgSubscriptionStatus: string;
  orgCurrentPeriodEnd: Date | null;
}): Promise<boolean> {
  if (isPlatformAdmin(ctx.userEmail)) return false;
  // Limita mare doar cu abonament efectiv plătit — nu după `package` (poate fi ales la înscriere, fără plată).
  const max = esteAbonamentPlatit({ subscriptionStatus: ctx.orgSubscriptionStatus, currentPeriodEnd: ctx.orgCurrentPeriodEnd })
    ? LIMITA_ZILNICA_PLATIT
    : LIMITA_ZILNICA_PROBA;
  return !(await verificaLimitaRata("ai-generari", ctx.orgId, max, 24 * 60));
}
