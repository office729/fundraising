"use server";

import { and, gte, sql } from "drizzle-orm";

import { withOrgSession, type OrgContext } from "@/lib/auth/guard";
import { apeluri, companies, companySponsorizari, donatoriReali, fundraisingPages, memberships, organizations } from "@/lib/db/schema";
import { segmentFirma } from "@/lib/id-scurt";

// Sursa reală pentru cardul "Apeluri" din "Activitatea echipei" (dashboard) —
// număr de apeluri REALE (Twilio), nu cifra demonstrativă fixă de dinainte.
// Numără toate încercările (indiferent de rezultat), ca "câte telefoane a
// dat" să răspundă efectiv la întrebare.
async function apeluriImpl(ctx: OrgContext) {
  const [{ n }] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(apeluri)
    .where(and(sql`${apeluri.orgId} = ${ctx.orgId}`, gte(apeluri.createdAt, sql`now() - interval '30 days'`)));
  return n;
}
export const numarApeluriUltimele30Zile = withOrgSession(apeluriImpl);

// Top firme sponsori (total, toate sponsorizările înregistrate) — date REALE din
// fișele companiilor, pentru cardul „Top sponsori” de pe prima pagină.
async function topSponsoriImpl(ctx: OrgContext) {
  const rows = await ctx.db
    .select({
      id: companies.id,
      nume: companies.nume,
      total: sql<number>`sum(${companySponsorizari.suma})::int`,
      numar: sql<number>`count(*)::int`,
    })
    .from(companySponsorizari)
    .innerJoin(companies, sql`${companies.id} = ${companySponsorizari.companyId}`)
    .where(and(sql`${companySponsorizari.orgId} = ${ctx.orgId}`, sql`${companies.deletedAt} is null`))
    .groupBy(companies.id, companies.nume)
    .orderBy(sql`sum(${companySponsorizari.suma}) desc`)
    .limit(7);
  return rows.map((r) => ({ id: r.id, nume: r.nume, total: r.total, numar: r.numar, segment: segmentFirma(r.nume, r.id) }));
}
export const topFirmeSponsori = withOrgSession(topSponsoriImpl);

// Alertă de risc pe pipeline: firme care sponsorizau, dar n-au mai donat de
// mult — genul de pierdere care se întâmplă din neatenție, nu din refuz.
// Doar firme cu istoric real de sponsorizare (nu prospecți niciodată
// abordați — aceia sunt un subiect diferit, de scor/prospectare).
const PRAG_ZILE_RISC = 300; // ~10 luni
async function riscPipelineImpl(ctx: OrgContext) {
  const rows = await ctx.db
    .select({
      id: companies.id,
      nume: companies.nume,
      ultimaData: sql<string>`max(${companySponsorizari.data})`,
      zileDeLaUltima: sql<number>`(current_date - max(${companySponsorizari.data}))::int`,
    })
    .from(companySponsorizari)
    .innerJoin(companies, sql`${companies.id} = ${companySponsorizari.companyId}`)
    .where(and(sql`${companySponsorizari.orgId} = ${ctx.orgId}`, sql`${companies.deletedAt} is null`, sql`${companies.status} <> 'lost'`))
    .groupBy(companies.id, companies.nume)
    .having(sql`(current_date - max(${companySponsorizari.data})) >= ${PRAG_ZILE_RISC}`)
    .orderBy(sql`max(${companySponsorizari.data}) asc`)
    .limit(8);
  return rows.map((r) => ({ id: r.id, nume: r.nume, ultimaData: r.ultimaData, luni: Math.floor(r.zileDeLaUltima / 30), segment: segmentFirma(r.nume, r.id) }));
}
export const companiiRiscPipeline = withOrgSession(riscPipelineImpl);


// „Primii pași”: ce a făcut deja organizația, pe date reale (sigla, prima pagină de campanie, donatori, colegi în echipă).
async function primiiPasiImpl(ctx: OrgContext) {
  const [[org], [pagini], [donatori], [membri]] = await Promise.all([
    ctx.db.select({ logo: organizations.logoUrl }).from(organizations).where(sql`${organizations.id} = ${ctx.orgId}`).limit(1),
    ctx.db.select({ n: sql<number>`count(*)::int` }).from(fundraisingPages).where(sql`${fundraisingPages.orgId} = ${ctx.orgId}`),
    ctx.db.select({ n: sql<number>`count(*)::int` }).from(donatoriReali).where(sql`${donatoriReali.orgId} = ${ctx.orgId}`),
    ctx.db.select({ n: sql<number>`count(*)::int` }).from(memberships).where(sql`${memberships.orgId} = ${ctx.orgId}`),
  ]);
  return { logo: Boolean(org?.logo), pagina: pagini.n > 0, donatori: donatori.n > 0, echipa: membri.n > 1 };
}

// Citirile paginii principale într-O SINGURĂ cerere și tranzacție: înainte, acțiuni separate porneau la montare, iar Next le
// execută una după alta (fiecare cu verificare de sesiune + tranzacție proprie).
export const dateDashboardLive = withOrgSession(async (ctx) => {
  const [apeluri, topSponsori, riscPipeline, primiiPasi] = await Promise.all([
    apeluriImpl(ctx),
    topSponsoriImpl(ctx),
    riscPipelineImpl(ctx),
    primiiPasiImpl(ctx),
  ]);
  return { apeluri, topSponsori, riscPipeline, primiiPasi };
});
