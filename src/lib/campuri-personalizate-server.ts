import "server-only";

import { and, asc, eq, sql } from "drizzle-orm";

import { curataValori, esteTipCamp, valoriDinJson, type DefinitieCamp, type EntitateCamp, type ValoriCamp } from "@/lib/campuri-personalizate";
import type { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";
import { campuriPersonalizate } from "@/lib/db/schema";
import { sqlArray } from "@/lib/sql-array";

// Definițiile câmpurilor personalizate ale organizației și salvarea valorilor la donatori sau firme. Se apelează în contextul organizației (ctx.db din withOrgSession
// sau o tranzacție cu app.current_org_id setat); toate interogările au și predicat explicit pe org_id.
type Database = Pick<typeof db, "select" | "execute">;

export async function listeazaDefinitii(database: Database, orgId: string, entitate: EntitateCamp, doarActive = true): Promise<DefinitieCamp[]> {
  const randuri = await database
    .select()
    .from(campuriPersonalizate)
    .where(and(eq(campuriPersonalizate.orgId, orgId), eq(campuriPersonalizate.entitate, entitate), ...(doarActive ? [eq(campuriPersonalizate.activ, true)] : [])))
    .orderBy(asc(campuriPersonalizate.ordine), asc(campuriPersonalizate.createdAt));
  return randuri
    .filter((r) => esteTipCamp(r.tip))
    .map((r) => ({ id: r.id, entitate, cheie: r.cheie, eticheta: r.eticheta, tip: r.tip as DefinitieCamp["tip"], optiuni: Array.isArray(r.optiuni) ? r.optiuni.map(String) : [], ordine: r.ordine, activ: r.activ }));
}

export type RezultatSalvareCampuri = { ok: true; campuri: ValoriCamp } | { ok: false; mesaj: string; erori: Record<string, string> };

// Salvează valorile trimise: doar câmpurile active ale organizației, aduse la tip; golul șterge valoarea. Câmpurile netrimise sau arhivate rămân neatinse.
// `locale` (implicit română) alege limba mesajelor întoarse.
export async function salveazaValori(database: Database, orgId: string, entitate: EntitateCamp, idEntitate: string, brut: Record<string, unknown>, locale: Locale = "ro"): Promise<RezultatSalvareCampuri> {
  const en = locale === "en";
  const defs = await listeazaDefinitii(database, orgId, entitate, true);
  const r = curataValori(defs, brut, locale);
  if (Object.keys(r.erori).length > 0) return { ok: false, mesaj: en ? "Check the marked fields." : "Verifică câmpurile marcate.", erori: r.erori };
  const tabel = entitate === "donator" ? sql`donatori_reali` : sql`companies`;
  const rez = (await database.execute(sql`
    update ${tabel} set campuri = (coalesce(campuri, '{}'::jsonb) - ${sqlArray(r.de_sters)}) || ${JSON.stringify(r.de_pus)}::text::jsonb
    where id = ${idEntitate} and org_id = ${orgId}
    returning campuri`)) as unknown as { campuri: unknown }[];
  if (rez.length === 0) return { ok: false, mesaj: en ? (entitate === "donator" ? "The donor was not found." : "The company was not found.") : entitate === "donator" ? "Donatorul nu a fost găsit." : "Firma nu a fost găsită.", erori: {} };
  return { ok: true, campuri: valoriDinJson(rez[0].campuri) };
}
