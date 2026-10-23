import "server-only";

import { previzualizareActiva } from "@/lib/suport/previzualizare-activa";
import type { PersonalizareOrg } from "@/lib/personalizare-org";

import { citestePersonalizareOrg } from "./personalizare-actions";

// Personalizarea care se aplică acum paginii: a organizației, sau, în previzualizarea de suport (administrator pe organizația demo, cu cookie valid), a organizației
// previzualizate. Folosită de paginile cu variante (vezi VARIANTE_PAGINI în lib/personalizare-org.ts).
export async function personalizareEfectiva(orgSlug: string, userEmail: string): Promise<PersonalizareOrg | null> {
  const activa = await previzualizareActiva(orgSlug, userEmail);
  return activa ? activa.config : citestePersonalizareOrg(orgSlug);
}
