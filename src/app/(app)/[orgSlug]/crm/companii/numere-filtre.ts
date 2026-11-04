import "server-only";

import { raporteazaEroare } from "@/lib/monitoring";

import { cheieNumere, creeazaMemorie, cuLimita, LIMITA_NUMERE_MS, TTL_NUMERE_MS, type NumereFiltre } from "./lib/filtre-extra";
import type { FiltruCompanii } from "./lib/filters";
import { getNumereFiltre } from "./queries";

// Numerele din selectele „Contact” și „Waalaxy”: se numără toată baza (lent), deci rezultatul se memorează 2 minute pe combinația de filtre (în memoria instanței) și
// așteptarea e limitată la 5 secunde, FĂRĂ să se întrerupă conexiunea: dacă durează, eticheta apare fără număr, iar numărătoarea își termină treaba în fundal și scrie în memorie.
// Cheia include ORGANIZAȚIA: nicio cifră nu trece de la o organizație la alta.
const memorie = creeazaMemorie<NumereFiltre>({ ttlMs: TTL_NUMERE_MS, max: 300 });

export async function numereFiltreMemorate(orgSlug: string, orgId: string, userId: string, filtru: FiltruCompanii, esteAdmin: boolean): Promise<NumereFiltre | null> {
  const cheie = cheieNumere(orgId, userId, filtru, esteAdmin);
  const gasit = memorie.citeste(cheie);
  if (gasit) return gasit;
  return cuLimita(getNumereFiltre(orgSlug, filtru), LIMITA_NUMERE_MS, {
    laSfarsit: (v) => memorie.scrie(cheie, v),
    laEroare: (e) => raporteazaEroare("companii-numere-filtre", e, { orgId }),
  });
}
