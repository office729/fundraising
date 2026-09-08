import { and, desc, eq, sql } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { appUsers, donatorNotite, donatoriReali, fundraisingDonations } from "@/lib/db/schema";

import { type FiltruDonatoriReali } from "./lib/filters";

const PAGE_SIZE = 25;

export const getDonatoriRealiLista = withOrgSession(async (ctx, filtru: FiltruDonatoriReali) => {
  const cond = [eq(donatoriReali.orgId, ctx.orgId)];
  if (filtru.q.trim()) {
    const q = `%${filtru.q.trim()}%`;
    cond.push(sql`(${donatoriReali.nume} ilike ${q} or ${donatoriReali.email} ilike ${q})`);
  }
  const where = and(...cond)!;

  const [{ total }] = await ctx.db.select({ total: sql<number>`count(*)::int` }).from(donatoriReali).where(where);

  const rows = await ctx.db
    .select()
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

  return { donator, donatii, notite };
});
