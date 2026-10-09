"use server";

import { withOrgSession } from "@/lib/auth/guard";
import { incarcaDiscutii, salveazaIntrare, stergeIntrare, type IntrareInput } from "@/lib/performanta-evaluari";
import { incarcaRaportEvaluari } from "@/lib/performanta-rapoarte-evaluari";

// Învelișuri cu sesiune peste lib/performanta-evaluari.ts (drepturile se verifică acolo, pe server).
export const obtineDiscutii = withOrgSession(async (ctx, angajatId: string | null) => incarcaDiscutii(ctx, angajatId));
export const salveazaIntrareAction = withOrgSession(async (ctx, input: IntrareInput) => salveazaIntrare(ctx, input));
export const stergeIntrareAction = withOrgSession(async (ctx, id: string) => stergeIntrare(ctx, id));
export const obtineRaportEvaluari = withOrgSession(async (ctx, cod: string | null) => {
  const raport = await incarcaRaportEvaluari(ctx, cod);
  // Fără conținutul intrărilor: pagina arată doar acoperirea; textele ies doar prin exportul auditat.
  const { intrari: _intrari, ...fara } = raport;
  void _intrari;
  return { raport: fara, admin: ctx.role === "owner" || ctx.role === "admin", manager: raport.persoane.length > 1 };
});
