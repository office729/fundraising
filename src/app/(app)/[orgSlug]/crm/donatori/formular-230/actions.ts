"use server";

import { and, eq, inArray } from "drizzle-orm";

import { withOrgAdmin, withOrgSession } from "@/lib/auth/guard";
import { formular230Submissions } from "@/lib/db/schema";
import type { DateFormular230Pdf } from "@/lib/formular230-pdf";
import { decripteazaSauLegacy } from "@/lib/secret-box";

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

// CNP-ul, adresa completă și semnătura NU mai ajung în browser odată cu lista
// (page.tsx trimite doar câmpurile de afișare). Se aduc la cerere, pentru UN
// rând, doar de owner/admin — la generarea PDF-ului.
export const obtineDatePdf = withOrgAdmin(async (ctx, id: string): Promise<DateFormular230Pdf | null> => {
  const [s] = await ctx.db
    .select()
    .from(formular230Submissions)
    .where(and(eq(formular230Submissions.id, id), eq(formular230Submissions.orgId, ctx.orgId)))
    .limit(1);
  if (!s) return null;
  return {
    nume: s.nume,
    prenume: s.prenume,
    initialaTatalui: s.initialaTatalui ?? "",
    cnp: decripteazaSauLegacy(s.cnp),
    email: s.email,
    telefon: s.telefon ?? "",
    strada: s.strada ?? "",
    numar: s.numar ?? "",
    judet: s.judet ?? "",
    localitate: s.localitate ?? "",
    codPostal: s.codPostal ?? "",
    bloc: s.bloc ?? "",
    scara: s.scara ?? "",
    etaj: s.etaj ?? "",
    apartament: s.apartament ?? "",
    semnatura: s.semnatura,
    an: s.an ?? s.createdAt.getFullYear(),
  };
});

// Pentru exporturile Excel/borderou ANAF (CNP obligatoriu acolo): întoarce
// DOAR id → CNP, la cerere, owner/admin. Limitat la aceeași cifră ca lista.
export const obtineCnpPentruExport = withOrgAdmin(async (ctx, ids: string[]): Promise<Record<string, string>> => {
  const lista = ids.slice(0, 1000);
  if (!lista.length) return {};
  const randuri = await ctx.db
    .select({ id: formular230Submissions.id, cnp: formular230Submissions.cnp })
    .from(formular230Submissions)
    .where(and(inArray(formular230Submissions.id, lista), eq(formular230Submissions.orgId, ctx.orgId)));
  return Object.fromEntries(randuri.map((r) => [r.id, decripteazaSauLegacy(r.cnp)]));
});
