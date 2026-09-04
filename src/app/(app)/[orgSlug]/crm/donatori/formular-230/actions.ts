"use server";

import { and, eq } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { formular230Submissions } from "@/lib/db/schema";

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
