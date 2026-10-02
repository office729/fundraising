"use server";

import { eq } from "drizzle-orm";

import { withOrgAdmin } from "@/lib/auth/guard";
import { canvaConfigurat, listeazaSabloaneBrand, type SablonBrand } from "@/lib/canva";
import { canvaConnections } from "@/lib/db/schema";
import { EroareUtilizator, mesajSigur } from "@/lib/erori";

export type StatusCanva = {
  configurat: boolean; // CANVA_CLIENT_ID/SECRET setate în mediu
  conectat: boolean;
  brandTemplateId: string | null;
  brandTemplateNume: string | null;
};

export const obtineStatusCanvaAction = withOrgAdmin(async (ctx): Promise<StatusCanva> => {
  const [conn] = await ctx.db
    .select({ brandTemplateId: canvaConnections.brandTemplateId, brandTemplateNume: canvaConnections.brandTemplateNume })
    .from(canvaConnections)
    .where(eq(canvaConnections.orgId, ctx.orgId))
    .limit(1);
  return {
    configurat: canvaConfigurat(),
    conectat: Boolean(conn),
    brandTemplateId: conn?.brandTemplateId ?? null,
    brandTemplateNume: conn?.brandTemplateNume ?? null,
  };
});

export const listeazaSabloaneCanvaAction = withOrgAdmin(async (ctx): Promise<SablonBrand[]> => {
  try {
    return await listeazaSabloaneBrand(ctx.db, ctx.orgId);
  } catch (e) {
    throw new EroareUtilizator(mesajSigur(e, "Nu am putut lista șabloanele din Canva.", "canva-sabloane"));
  }
});

export const salveazaSablonCanvaAction = withOrgAdmin(async (ctx, templateId: string, templateNume: string) => {
  await ctx.db
    .update(canvaConnections)
    .set({ brandTemplateId: templateId, brandTemplateNume: templateNume })
    .where(eq(canvaConnections.orgId, ctx.orgId));
});

export const deconecteazaCanvaAction = withOrgAdmin(async (ctx) => {
  await ctx.db.delete(canvaConnections).where(eq(canvaConnections.orgId, ctx.orgId));
});
