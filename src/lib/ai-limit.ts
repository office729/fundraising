import "server-only";

import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { isPlatformAdmin } from "@/lib/billing/trial";

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
export async function limitaAIDepasita(ctx: { orgId: string; orgPackage: string; userEmail: string }): Promise<boolean> {
  if (isPlatformAdmin(ctx.userEmail)) return false;
  const max = ctx.orgPackage === "trial" ? LIMITA_ZILNICA_PROBA : LIMITA_ZILNICA_PLATIT;
  return !(await verificaLimitaRata("ai-generari", ctx.orgId, max, 24 * 60));
}
