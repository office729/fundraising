"use server";

import { and, eq } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { formular230Submissions } from "@/lib/db/schema";
import { cripteaza } from "@/lib/secret-box";

// org_id în WHERE, nu doar id — chiar dacă cineva ghicește/manipulează un id
// din altă organizație, nu poate șterge decât rânduri din PROPRIA organizație.
export const stergeFormular230 = withOrgSession(async (ctx, id: string) => {
  await ctx.db
    .delete(formular230Submissions)
    .where(and(eq(formular230Submissions.id, id), eq(formular230Submissions.orgId, ctx.orgId)));
});

export const seteazaProcesatAnaf = withOrgSession(async (ctx, id: string, procesat: boolean) => {
  await ctx.db
    .update(formular230Submissions)
    .set({ procesatAnaf: procesat })
    .where(and(eq(formular230Submissions.id, id), eq(formular230Submissions.orgId, ctx.orgId)));
});

// TEMPORAR — backfill unic pentru rândurile scrise înainte de migrarea CNP-ului
// la criptare (vezi secret-box.ts). Se șterge după prima rulare reușită.
export const backfillCnpCriptatTemp = withOrgSession(async (ctx) => {
  const randuri = await ctx.db
    .select({ id: formular230Submissions.id, cnp: formular230Submissions.cnp })
    .from(formular230Submissions)
    .where(eq(formular230Submissions.orgId, ctx.orgId));
  let actualizate = 0;
  for (const r of randuri) {
    if (r.cnp.startsWith("v1.")) continue;
    await ctx.db
      .update(formular230Submissions)
      .set({ cnp: cripteaza(r.cnp) })
      .where(and(eq(formular230Submissions.id, r.id), eq(formular230Submissions.orgId, ctx.orgId)));
    actualizate++;
  }
  return { total: randuri.length, actualizate };
});
