"use server";

import { withOrgAdmin, withOrgFaze } from "@/lib/auth/guard";
import { citesteConfigAi } from "@/lib/ai-org/consum-server";
import { getLocale } from "@/lib/i18n/get-locale";
import { apeleazaAnaliza, citesteAnalize, pregatesteAnaliza, salveazaAnaliza, type AnalizaSalvata, type Pregatit, type RezultatAnaliza, type RezultatExtern } from "@/lib/reclame/analiza-ai-server";

// Analiza AI a reclamelor (doar proprietar/administratori; rulează pe contul Anthropic al organizației). Modulul „ai-agenti” (IMPACT) acoperă și „reclame”.
// Nimic din analiză nu modifică bugete sau reclame: propunerile sunt doar text pentru oameni.
const OPT = { modul: "ai-agenti" as const };

export type AnalizeReclamePagina = { analize: AnalizaSalvata[]; aiConectat: boolean };

export const obtineAnalizeReclame = withOrgAdmin(async (ctx): Promise<AnalizeReclamePagina> => {
  const cfg = await citesteConfigAi(ctx.db, ctx.orgId, false);
  return { analize: await citesteAnalize(ctx.db, ctx.orgId), aiConectat: cfg.conectat };
}, { modul: "reclame" });

// Butonul „Analizează acum”: fără cont Anthropic întoarce mesajul „Conectează contul…”, nu o eroare. Apelul AI rulează fără conexiune deschisă la baza de date.
export const pornesteAnalizaReclame = withOrgFaze<[], Pregatit, RezultatExtern, RezultatAnaliza>({
  admin: true,
  opts: OPT,
  pregateste: async (ctx) => {
    const locale = await getLocale();
    return pregatesteAnaliza(ctx.db, ctx.orgId, { sursa: "manual", userId: ctx.userId, locale });
  },
  extern: apeleazaAnaliza,
  salveaza: (ctx, pregatit, extern) => salveazaAnaliza(ctx.db, ctx.orgId, pregatit, extern),
});
