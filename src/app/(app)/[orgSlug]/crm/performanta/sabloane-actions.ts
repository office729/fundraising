"use server";

import { withOrgSession } from "@/lib/auth/guard";
import type { TintaOrg } from "@/lib/performanta-sabloane";
import { referinteCrm, resetSablonOrg, sabloaneEfective, salveazaSablonOrg } from "@/lib/performanta-sabloane-setari";

// Învelișuri cu sesiune peste lib/performanta-sabloane-setari.ts. Editarea țintelor cere drept de administrator (verificat acolo).
export const obtineSabloane = withOrgSession(async (ctx) => sabloaneEfective(ctx.db, ctx.orgId));
export const obtineSabloaneSiReferinte = withOrgSession(async (ctx) => ({
  sabloane: await sabloaneEfective(ctx.db, ctx.orgId),
  referinte: await referinteCrm(ctx),
  admin: ctx.role === "owner" || ctx.role === "admin",
}));
export const salveazaSablonAction = withOrgSession(async (ctx, sablonId: string, tinte: Record<string, TintaOrg>, confirmat: boolean) => salveazaSablonOrg(ctx, sablonId, tinte, confirmat));
export const resetSablonAction = withOrgSession(async (ctx, sablonId: string) => resetSablonOrg(ctx, sablonId));
