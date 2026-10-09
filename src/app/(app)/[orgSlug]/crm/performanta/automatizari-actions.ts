"use server";

import { withOrgSessionPerf as withOrgSession } from "@/lib/performanta-sesiune";
import { incarcaStructura } from "@/lib/performanta-date";
import { incarcaNotificari, incarcaSetari, marcheazaCitite, numarNecitite, ruleazaAutomatizari, salveazaSetari, type SetariAutomatizari } from "@/lib/performanta-automatizari";

// Învelișuri cu sesiune peste lib/performanta-automatizari.ts. Configurarea și rularea manuală cer drept de administrator.
export const obtineSetari = withOrgSession(async (ctx) => ({
  setari: await incarcaSetari(ctx.db, ctx.orgId),
  angajati: (await incarcaStructura(ctx)).angajati.filter((a) => a.activ).map((a) => ({ id: a.id, nume: a.nume })),
  admin: ctx.role === "owner" || ctx.role === "admin",
}));
export const salveazaSetariAction = withOrgSession(async (ctx, x: Partial<SetariAutomatizari>) => salveazaSetari(ctx, x));
export const ruleazaAcumAction = withOrgSession(async (ctx) => {
  if (ctx.role !== "owner" && ctx.role !== "admin") return { ok: false as const, eroare: "Doar un administrator poate rula automatizările acum." };
  const r = await ruleazaAutomatizari(ctx.db, ctx.orgId, ctx.orgSlug, { fortat: true });
  return { ok: true as const, rezultat: r.rezultat };
});
export const obtineNotificari = withOrgSession(async (ctx) => incarcaNotificari(ctx));
export const numarNotificariNecitite = withOrgSession(async (ctx) => numarNecitite(ctx));
export const marcheazaCititeAction = withOrgSession(async (ctx, ids: string[] | "toate") => {
  await marcheazaCitite(ctx, ids);
});
