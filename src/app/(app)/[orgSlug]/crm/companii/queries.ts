import { and, desc, eq, sql } from "drizzle-orm";

import { withOrgSession } from "@/lib/auth/guard";
import { appUsers, companies, companyNotite, companySponsorizari, contacts, memberships } from "@/lib/db/schema";

import { calculeazaInterval, type FiltruCompanii, TOP_LIMIT } from "./lib/filters";

const PAGE_SIZE = 25;

// Condiții COMUNE listei și statisticilor — orice filtru nou trebuie adăugat
// AICI o singură dată, ca lista și cardurile de sus să rămână mereu coerente
// (aceleași firme numărate = aceleași firme afișate).
function conditiiComune(f: FiltruCompanii) {
  const cond = [sql`1=1`];
  if (f.q.trim()) cond.push(sql`${companies.nume} ilike ${"%" + f.q.trim() + "%"}`);
  if (f.judet !== "toate") cond.push(eq(companies.judet, f.judet));
  if (f.responsabil !== "toti") cond.push(eq(companies.ownerId, f.responsabil));
  if (f.contact === "cu") {
    cond.push(sql`exists (select 1 from ${contacts} where ${contacts.companyId} = ${companies.id} and (${contacts.telefon} is not null or ${contacts.email} is not null))`);
  } else if (f.contact === "fara") {
    cond.push(sql`not exists (select 1 from ${contacts} where ${contacts.companyId} = ${companies.id} and (${contacts.telefon} is not null or ${contacts.email} is not null))`);
  }
  for (const m of f.marcaje) {
    if (m === "d177") cond.push(eq(companies.d177, true));
    else if (m === "decembrie") cond.push(eq(companies.decembrie, true));
    else if (m === "caz") cond.push(eq(companies.mec20, true));
  }
  if (f.vezi === "lucrate") {
    cond.push(
      sql`(${companies.ownerId} is not null or ${companies.stage} <> 'nou' or exists (select 1 from ${companySponsorizari} where ${companySponsorizari.companyId} = ${companies.id}) or exists (select 1 from ${companyNotite} where ${companyNotite.companyId} = ${companies.id}))`,
    );
  }
  const { start, end } = calculeazaInterval(f);
  if (start && end) {
    cond.push(
      sql`exists (select 1 from ${companySponsorizari} where ${companySponsorizari.companyId} = ${companies.id} and ${companySponsorizari.data} >= ${start} and ${companySponsorizari.data} < ${end})`,
    );
  }
  return and(...cond)!;
}

export type RandCompanie = {
  id: string;
  nume: string;
  judet: string | null;
  localitate: string | null;
  responsabilNume: string | null;
  sumaSponsorizata: number;
  recurent: boolean;
  d177: boolean;
  d177Incasat: boolean;
  decembrie: boolean;
  mec20: boolean;
  temperatura: "cald" | "rece" | null;
  updatedAt: Date;
  lastViewedAt: Date | null;
};

export const getCompaniiLista = withOrgSession(async (ctx, filtru: FiltruCompanii) => {
  const where = and(eq(companies.orgId, ctx.orgId), sql`${companies.deletedAt} is null`, conditiiComune(filtru));

  const [{ total: totalReal }] = await ctx.db.select({ total: sql<number>`count(*)::int` }).from(companies).where(where);
  const total = filtru.top ? Math.min(totalReal, TOP_LIMIT) : totalReal;

  const rows = await ctx.db
    .select({
      id: companies.id,
      nume: companies.nume,
      judet: companies.judet,
      localitate: companies.localitate,
      responsabilNume: appUsers.name,
      sumaSponsorizata: sql<number>`coalesce(${companies.sumaSponsorizata}, 0)::int`,
      recurent: companies.recurent,
      d177: companies.d177,
      d177Incasat: companies.d177Incasat,
      decembrie: companies.decembrie,
      mec20: companies.mec20,
      temperatura: companies.temperatura,
      updatedAt: companies.updatedAt,
      lastViewedAt: companies.lastViewedAt,
    })
    .from(companies)
    .leftJoin(appUsers, eq(appUsers.id, companies.ownerId))
    .where(where)
    .orderBy(filtru.top ? desc(sql`coalesce(${companies.sumaSponsorizata}, 0)`) : desc(companies.updatedAt))
    .limit(PAGE_SIZE)
    .offset((filtru.pagina - 1) * PAGE_SIZE);

  return { rows: rows as RandCompanie[], total, pageSize: PAGE_SIZE, pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
});

export type StatisticiCompanii = {
  companii: number;
  sponsorizari: number;
  totalSponsorizat: number;
  recurenti: number;
  recurentiPct: number;
  medieSponsorizare: number;
  medieCompanie: number;
};

// Statisticile sunt calculate DOAR din company_sponsorizari (sursa reală de
// tranzacții, cu dată) — nu din cache-ul companies.suma_sponsorizata, ca să
// răspundă corect la filtrul de perioadă. companii/sponsorizari filtrate prin
// aceleași condiții comune (JOIN pe companies), plus intervalul de dată direct
// pe sponsorizări (nu prin EXISTS, ca la listă — aici avem nevoie de SUM/COUNT
// pe rândurile de sponsorizare, nu doar de firmele care au cel puțin una).
export const getStatisticiCompanii = withOrgSession(async (ctx, filtru: FiltruCompanii): Promise<StatisticiCompanii> => {
  const { start, end } = calculeazaInterval(filtru);
  const dataCond = start && end ? sql`and ${companySponsorizari.data} >= ${start} and ${companySponsorizari.data} < ${end}` : sql``;

  const filtruFaraPerioada: FiltruCompanii = { ...filtru, perioadaTip: "toate" };
  const condCompanii = conditiiComune(filtruFaraPerioada);

  const [row] = await ctx.db
    .select({
      companii: sql<number>`count(distinct ${companySponsorizari.companyId})::int`,
      sponsorizari: sql<number>`count(*)::int`,
      totalSponsorizat: sql<number>`coalesce(sum(${companySponsorizari.suma}), 0)::int`,
      recurenti: sql<number>`count(distinct ${companySponsorizari.companyId}) filter (where ${companies.recurent})::int`,
    })
    .from(companySponsorizari)
    .innerJoin(companies, eq(companies.id, companySponsorizari.companyId))
    .where(sql`${companySponsorizari.orgId} = ${ctx.orgId} and ${companies.deletedAt} is null and (${condCompanii}) ${dataCond}`);

  const companii = row?.companii ?? 0;
  const sponsorizari = row?.sponsorizari ?? 0;
  const totalSponsorizat = row?.totalSponsorizat ?? 0;
  const recurenti = row?.recurenti ?? 0;

  return {
    companii,
    sponsorizari,
    totalSponsorizat,
    recurenti,
    recurentiPct: companii ? Math.round((recurenti / companii) * 100) : 0,
    medieSponsorizare: sponsorizari ? Math.round(totalSponsorizat / sponsorizari) : 0,
    medieCompanie: companii ? Math.round(totalSponsorizat / companii) : 0,
  };
});

export const getTotalFirme = withOrgSession(async (ctx) => {
  const [{ total }] = await ctx.db
    .select({ total: sql<number>`count(*)::int` })
    .from(companies)
    .where(and(eq(companies.orgId, ctx.orgId), sql`${companies.deletedAt} is null`));
  return total;
});

export const getResponsabiliOrg = withOrgSession(async (ctx) => {
  return ctx.db
    .select({ id: appUsers.id, name: appUsers.name, email: appUsers.email })
    .from(memberships)
    .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
    .where(eq(memberships.orgId, ctx.orgId))
    .orderBy(appUsers.name);
});

export const getCompanieDetaliu = withOrgSession(async (ctx, id: string) => {
  const rows = await ctx.db
    .select()
    .from(companies)
    .where(and(eq(companies.id, id), eq(companies.orgId, ctx.orgId), sql`${companies.deletedAt} is null`))
    .limit(1);
  if (!rows[0]) return null;
  const companie = rows[0];

  // Bifează vizita — trebuie așteptat, nu fire-and-forget: rulează în aceeași
  // tranzacție (withOrgSession) care se închide imediat ce funcția revine.
  await ctx.db.update(companies).set({ lastViewedAt: new Date() }).where(eq(companies.id, id));

  const [sponsorizari, notite, contacteFirma, responsabili] = await Promise.all([
    ctx.db.select().from(companySponsorizari).where(eq(companySponsorizari.companyId, id)).orderBy(desc(companySponsorizari.data)),
    ctx.db
      .select({ id: companyNotite.id, text: companyNotite.text, createdAt: companyNotite.createdAt, editatLa: companyNotite.editatLa, autorNume: appUsers.name })
      .from(companyNotite)
      .leftJoin(appUsers, eq(appUsers.id, companyNotite.createdBy))
      .where(eq(companyNotite.companyId, id))
      .orderBy(desc(companyNotite.createdAt)),
    ctx.db.select().from(contacts).where(eq(contacts.companyId, id)).orderBy(desc(contacts.createdAt)),
    ctx.db
      .select({ id: appUsers.id, name: appUsers.name })
      .from(memberships)
      .innerJoin(appUsers, eq(appUsers.id, memberships.userId))
      .where(eq(memberships.orgId, ctx.orgId)),
  ]);

  return { companie, sponsorizari, notite, contacte: contacteFirma, responsabili };
});
