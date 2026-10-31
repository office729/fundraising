"use server";

import { revalidatePath } from "next/cache";

import { withOrgAdmin } from "@/lib/auth/guard";
import { FEREASTRA_MAXIMA_ZILE, FEREASTRA_MINIMA_ZILE } from "@/lib/atribuire/clasificare";
import { salveazaFereastra } from "@/lib/atribuire/server";
import { EroareUtilizator } from "@/lib/erori";
import { SURSE_UI_DICT } from "@/lib/i18n/dictionaries/surse-ui";
import { getLocale } from "@/lib/i18n/get-locale";

// Fereastra de atribuire (în zile): cât de departe în urmă se caută ultima sursă nedirectă înainte de o conversie. Doar proprietar/administrator.
// Se aplică conversiilor noi; cele deja salvate își păstrează instantaneul (vizitele ulterioare nu rescriu istoricul).
export const salveazaFereastraAtribuire = withOrgAdmin(async (ctx, zile: number) => {
  if (!Number.isFinite(zile) || zile < FEREASTRA_MINIMA_ZILE || zile > FEREASTRA_MAXIMA_ZILE) {
    throw new EroareUtilizator(SURSE_UI_DICT[await getLocale()].erori.fereastra(FEREASTRA_MINIMA_ZILE, FEREASTRA_MAXIMA_ZILE));
  }
  const valoare = await salveazaFereastra(ctx.db, ctx.orgId, zile);
  revalidatePath(`/${ctx.orgSlug}/crm/surse`);
  return valoare;
});
