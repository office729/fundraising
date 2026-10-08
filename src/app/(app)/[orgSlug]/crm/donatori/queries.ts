import { and, desc, eq, getTableColumns, sql, type SQL } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { patternLike, sqlFaraDiacritice } from "@/lib/cautare";
import { appUsers, donatorNotite, donatoriReali, fundraisingDonations, fundraisingPages } from "@/lib/db/schema";

import { type FiltruDonatoriReali } from "./lib/filters";

const PAGE_SIZE = 25;

// Ziua următoare („YYYY-MM-DD”) — pentru intervale deschise la capăt (`< ziua următoare`).
function ziuaUrmatoare(d: string): string {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + 1);
  return x.toISOString().slice(0, 10);
}

export const getDonatoriRealiLista = withOrgSession(async (ctx, filtru: FiltruDonatoriReali) => {
  const cond = [eq(donatoriReali.orgId, ctx.orgId)];
  if (filtru.q.trim()) {
    const q = `%${filtru.q.trim()}%`;
    cond.push(sql`(${donatoriReali.nume} ilike ${q} or ${donatoriReali.email} ilike ${q})`);
  }
  // Locație: insensibil la diacritice / majuscule (vezi lib/cautare.ts).
  if (filtru.judet.trim()) cond.push(sql`${sqlFaraDiacritice(sql`${donatoriReali.judet}`)} like ${patternLike(filtru.judet)}`);
  if (filtru.localitate.trim()) cond.push(sql`${sqlFaraDiacritice(sql`${donatoriReali.localitate}`)} like ${patternLike(filtru.localitate)}`);
  if (filtru.sumaMin !== null) cond.push(sql`${donatoriReali.totalDonat} >= ${filtru.sumaMin}`);
  if (filtru.sumaMax !== null) cond.push(sql`${donatoriReali.totalDonat} <= ${filtru.sumaMax}`);
  if (filtru.primaDe) cond.push(sql`${donatoriReali.primaDonatieLa} >= ${filtru.primaDe}::date`);
  if (filtru.primaPana) cond.push(sql`${donatoriReali.primaDonatieLa} < ${ziuaUrmatoare(filtru.primaPana)}::date`);

  // Filtrele pe donații (campanie, pentru cine, dată) se potrivesc pe ACEEAȘI donație reușită a donatorului.
  const cuDonatie: SQL[] = [];
  if (filtru.proiect) cuDonatie.push(sql`d.page_id::text = ${filtru.proiect}`);
  if (filtru.pentruCine.trim()) {
    const p = patternLike(filtru.pentruCine);
    cuDonatie.push(sql`(${sqlFaraDiacritice(sql`p.titlu`)} like ${p} or ${sqlFaraDiacritice(sql`p.nume_creator`)} like ${p})`);
  }
  if (filtru.dataDe) cuDonatie.push(sql`d.created_at >= ${filtru.dataDe}::date`);
  if (filtru.dataPana) cuDonatie.push(sql`d.created_at < ${ziuaUrmatoare(filtru.dataPana)}::date`);
  if (cuDonatie.length) {
    cond.push(sql`exists (
      select 1 from fundraising_donations d join fundraising_pages p on p.id = d.page_id
      where d.org_id = ${ctx.orgId} and d.email_donator = ${donatoriReali.email} and d.status = 'reusita' and ${sql.join(cuDonatie, sql` and `)}
    )`);
  }
  const where = and(...cond)!;

  const [{ total }] = await ctx.db.select({ total: sql<number>`count(*)::int` }).from(donatoriReali).where(where);

  const rows = await ctx.db
    .select({
      ...getTableColumns(donatoriReali),
      // Pentru cine a donat: titlurile campaniilor (beneficiarii) la care a donat, fără dubluri.
      pentruCine: sql<string | null>`(
        select string_agg(distinct p.titlu, ', ') from fundraising_donations d join fundraising_pages p on p.id = d.page_id
        where d.org_id = ${ctx.orgId} and d.email_donator = ${donatoriReali.email} and d.status = 'reusita')`,
    })
    .from(donatoriReali)
    .where(where)
    .orderBy(desc(donatoriReali.ultimaDonatieLa))
    .limit(PAGE_SIZE)
    .offset((filtru.pagina - 1) * PAGE_SIZE);

  return { rows, total, pageSize: PAGE_SIZE, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
});

export const getStatisticiDonatoriReali = withOrgSession(async (ctx) => {
  const [row] = await ctx.db
    .select({
      donatori: sql<number>`count(*)::int`,
      totalDonat: sql<number>`coalesce(sum(${donatoriReali.totalDonat}), 0)::int`,
      numarDonatii: sql<number>`coalesce(sum(${donatoriReali.numarDonatii}), 0)::int`,
      optInWhatsapp: sql<number>`count(*) filter (where ${donatoriReali.consimtamantWhatsapp})::int`,
    })
    .from(donatoriReali)
    .where(eq(donatoriReali.orgId, ctx.orgId));

  return {
    donatori: row?.donatori ?? 0,
    totalDonat: row?.totalDonat ?? 0,
    numarDonatii: row?.numarDonatii ?? 0,
    optInWhatsapp: row?.optInWhatsapp ?? 0,
  };
});

export const getDonatorRealDetaliu = withOrgSession(async (ctx, id: string) => {
  const rows = await ctx.db
    .select()
    .from(donatoriReali)
    .where(and(eq(donatoriReali.id, id), eq(donatoriReali.orgId, ctx.orgId)))
    .limit(1);
  if (!rows[0]) return null;
  const donator = rows[0];

  const [donatii, notite] = await Promise.all([
    ctx.db
      .select()
      .from(fundraisingDonations)
      .where(and(eq(fundraisingDonations.orgId, ctx.orgId), eq(fundraisingDonations.emailDonator, donator.email)))
      .orderBy(desc(fundraisingDonations.createdAt)),
    ctx.db
      .select({
        id: donatorNotite.id,
        text: donatorNotite.text,
        createdAt: donatorNotite.createdAt,
        editatLa: donatorNotite.editatLa,
        autorNume: appUsers.name,
      })
      .from(donatorNotite)
      .leftJoin(appUsers, eq(appUsers.id, donatorNotite.createdBy))
      .where(eq(donatorNotite.donatorId, id))
      .orderBy(desc(donatorNotite.createdAt)),
  ]);

  return { donator, donatii, notite, poateAdministra: ctx.role === "owner" || ctx.role === "admin" };
});

// Campaniile organizației — pentru filtrul „Proiect / campanie” și pentru dialogul „Donator nou”.
export const getCampaniiOptiuni = withOrgSession(async (ctx) =>
  ctx.db.select({ id: fundraisingPages.id, titlu: fundraisingPages.titlu }).from(fundraisingPages).where(eq(fundraisingPages.orgId, ctx.orgId)).orderBy(desc(fundraisingPages.createdAt)).limit(300),
);