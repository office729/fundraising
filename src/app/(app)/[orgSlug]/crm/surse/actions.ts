"use server";

import { revalidatePath } from "next/cache";

import { withOrgAdmin } from "@/lib/auth/guard";
import { FEREASTRA_MAXIMA_ZILE, FEREASTRA_MINIMA_ZILE } from "@/lib/atribuire/clasificare";
import { salveazaFereastra } from "@/lib/atribuire/server";
import { EroareUtilizator } from "@/lib/erori";

// Fereastra de atribuire (în zile): cât de departe în urmă se caută ultima sursă nedirectă înainte de o conversie. Doar proprietar/administrator.
// Se aplică conversiilor noi; cele deja salvate își păstrează instantaneul (vizitele ulterioare nu rescriu istoricul).
export const salveazaFereastraAtribuire = withOrgAdmin(async (ctx, zile: number) => {
  if (!Number.isFinite(zile) || zile < FEREASTRA_MINIMA_ZILE || zile > FEREASTRA_MAXIMA_ZILE) {
    throw new EroareUtilizator(`Alege o valoare între ${FEREASTRA_MINIMA_ZILE} și ${FEREASTRA_MAXIMA_ZILE} de zile.`);
  }
  const valoare = await salveazaFereastra(ctx.db, ctx.orgId, zile);
  revalidatePath(`/${ctx.orgSlug}/crm/surse`);
  return valoare;
});
