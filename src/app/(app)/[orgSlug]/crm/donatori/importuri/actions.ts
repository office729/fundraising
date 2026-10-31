"use server";

import { desc, eq } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { appUsers, donatoriImporturi } from "@/lib/db/schema";
import { stergeImport } from "@/lib/donatori-import-server";
import { DONATORI_UI3_DICT } from "@/lib/i18n/dictionaries/donatori-ui-3";
import { getLocale } from "@/lib/i18n/get-locale";

export type ImportListat = { id: string; nume: string; de: string | null; pana: string | null; nrImportate: number; nrDuplicate: number; nrDonatoriNoi: number; creatLa: string; autor: string | null };

export const listeazaImporturi = withOrgSession(async (ctx): Promise<ImportListat[]> => {
  const r = await ctx.db
    .select({
      id: donatoriImporturi.id, nume: donatoriImporturi.nume, de: donatoriImporturi.de, pana: donatoriImporturi.pana, nrImportate: donatoriImporturi.nrImportate,
      nrDuplicate: donatoriImporturi.nrDuplicate, nrDonatoriNoi: donatoriImporturi.nrDonatoriNoi, creatLa: donatoriImporturi.createdAt, autor: appUsers.name,
    })
    .from(donatoriImporturi)
    .leftJoin(appUsers, eq(appUsers.id, donatoriImporturi.createdBy))
    .where(eq(donatoriImporturi.orgId, ctx.orgId))
    .orderBy(desc(donatoriImporturi.createdAt))
    .limit(100);
  return r.map((x) => ({ ...x, creatLa: x.creatLa.toISOString() }));
});

export const stergeImportAction = withOrgSession(async (ctx, id: string): Promise<{ ok: true; donatoriStersi: number; donatiiSterse: number } | { ok: false; eroare: string }> => {
  const er = DONATORI_UI3_DICT[await getLocale()].importuri.erori;
  if (ctx.role !== "owner" && ctx.role !== "admin") return { ok: false, eroare: er.doarAdmin };
  if (!/^[0-9a-f-]{36}$/i.test(String(id))) return { ok: false, eroare: er.importInvalid };
  try {
    const r = await stergeImport(ctx, id);
    return { ok: true, donatoriStersi: r.donatoriStersi, donatiiSterse: r.stersi };
  } catch (e) {
    return { ok: false, eroare: e instanceof Error ? e.message : er.nuAmSters };
  }
});
