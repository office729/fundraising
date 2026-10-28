import { and, eq, sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { crmKv } from "@/lib/db/schema";
import { sqlArray } from "@/lib/sql-array";
import { ultimele9 } from "@/lib/cai-calde";

// Căile calde la nivelul întregii baze: firmele ai căror contacte (cu e-mail sau telefon) sunt deja donatori, voluntari sau contacte la ALTĂ firmă care a sponsorizat.
// Doar potrivirile SIGURE (e-mail sau ultimele 9 cifre ale telefonului); potrivirea pe nume (posibilă) rămâne pe fișa firmei (cai-calde.ts), unde un om o verifică.
// Rezultatul se păstrează în crm_kv (calea „cai-calde-set”) și se recalculează la cerere: filtrul „Cu cale caldă” din listă îl citește fără să refacă potrivirile.
export const CALE_SET = "cai-calde-set";

export type MotivCald = "donator" | "sponsor" | "voluntar";
export type SetCaiCalde = { ids: string[]; motive: Record<string, MotivCald>; la: string; n: number };

type Ctx = Pick<OrgContext, "db" | "orgId">;
const PRIORITATE: Record<MotivCald, number> = { donator: 3, sponsor: 2, voluntar: 1 };

const cifre = (col: ReturnType<typeof sql>) => sql`regexp_replace(coalesce(${col}, ''), '[^0-9]', '', 'g')`;

export async function calculeazaSet(ctx: Ctx): Promise<SetCaiCalde> {
  const o = ctx.orgId;
  const motive: Record<string, MotivCald> = {};
  const noteaza = (id: string, m: MotivCald) => {
    const vechi = motive[id];
    if (!vechi || PRIORITATE[m] > PRIORITATE[vechi]) motive[id] = m;
  };
  const ids = async (q: ReturnType<typeof sql>) => ((await ctx.db.execute(q)) as unknown as { id: string }[]).map((r) => r.id);

  // 1. Donatori: e-mail sau telefon identic.
  for (const id of await ids(sql`select distinct c.company_id::text as id from contacts c join donatori_reali d on d.org_id = c.org_id and lower(d.email) = lower(c.email) where c.org_id = ${o} and coalesce(c.email, '') <> ''`)) noteaza(id, "donator");
  for (const id of await ids(sql`select distinct c.company_id::text as id from contacts c join donatori_reali d on d.org_id = c.org_id and right(${cifre(sql`d.telefon`)}, 9) = right(${cifre(sql`c.telefon`)}, 9)
    where c.org_id = ${o} and length(${cifre(sql`c.telefon`)}) >= 9 and length(${cifre(sql`d.telefon`)}) >= 9`)) noteaza(id, "donator");

  // 2. Contacte la ALTĂ firmă care a sponsorizat (aceeași persoană, după e-mail sau telefon).
  for (const id of await ids(sql`select distinct c.company_id::text as id from contacts c
    join contacts c2 on c2.org_id = c.org_id and c2.company_id <> c.company_id and lower(c2.email) = lower(c.email)
    join companies s on s.id = c2.company_id and s.deleted_at is null and (s.status = 'won' or coalesce(s.suma_sponsorizata, 0) > 0)
    where c.org_id = ${o} and coalesce(c.email, '') <> ''`)) noteaza(id, "sponsor");
  for (const id of await ids(sql`select distinct c.company_id::text as id from contacts c
    join contacts c2 on c2.org_id = c.org_id and c2.company_id <> c.company_id and right(${cifre(sql`c2.telefon`)}, 9) = right(${cifre(sql`c.telefon`)}, 9)
    join companies s on s.id = c2.company_id and s.deleted_at is null and (s.status = 'won' or coalesce(s.suma_sponsorizata, 0) > 0)
    where c.org_id = ${o} and length(${cifre(sql`c.telefon`)}) >= 9 and length(${cifre(sql`c2.telefon`)}) >= 9`)) noteaza(id, "sponsor");

  // 3. Voluntari: lista din instrumentul CRM Voluntari (un singur document pe organizație).
  const [roster] = await ctx.db.select({ data: crmKv.data }).from(crmKv).where(and(eq(crmKv.orgId, o), eq(crmKv.path, "voluntari-roster"))).limit(1);
  const voluntari = Array.isArray((roster?.data as { volunteers?: unknown } | null)?.volunteers) ? (roster!.data as { volunteers: Record<string, unknown>[] }).volunteers : [];
  const emailuri = [...new Set(voluntari.map((v) => String(v.email ?? "").trim().toLowerCase()).filter(Boolean))];
  const telefoane = [...new Set(voluntari.map((v) => ultimele9(v.telefon ? String(v.telefon) : null)).filter(Boolean))];
  if (emailuri.length) for (const id of await ids(sql`select distinct company_id::text as id from contacts where org_id = ${o} and lower(email) = any(${sqlArray(emailuri)})`)) noteaza(id, "voluntar");
  if (telefoane.length) for (const id of await ids(sql`select distinct company_id::text as id from contacts where org_id = ${o} and length(${cifre(sql`telefon`)}) >= 9 and right(${cifre(sql`telefon`)}, 9) = any(${sqlArray(telefoane)})`)) noteaza(id, "voluntar");

  // Doar firmele încă active în baza de date.
  const active = new Set(((await ctx.db.execute(sql`select id::text as id from companies where org_id = ${o} and deleted_at is null`)) as unknown as { id: string }[]).map((r) => r.id));
  const finale: Record<string, MotivCald> = {};
  for (const [id, m] of Object.entries(motive)) if (active.has(id)) finale[id] = m;
  return { ids: Object.keys(finale), motive: finale, la: new Date().toISOString(), n: Object.keys(finale).length };
}

export async function salveazaSet(ctx: Ctx, set: SetCaiCalde): Promise<void> {
  await ctx.db
    .insert(crmKv)
    .values({ orgId: ctx.orgId, path: CALE_SET, data: set })
    .onConflictDoUpdate({ target: [crmKv.orgId, crmKv.path], set: { data: set, updatedAt: new Date() } });
}

export async function citesteSet(ctx: Ctx): Promise<{ n: number; la: string } | null> {
  const [r] = await ctx.db.select({ n: sql<number>`coalesce(jsonb_array_length(${crmKv.data}->'ids'), 0)::int`, la: sql<string | null>`${crmKv.data}->>'la'` }).from(crmKv).where(and(eq(crmKv.orgId, ctx.orgId), eq(crmKv.path, CALE_SET))).limit(1);
  return r?.la ? { n: r.n, la: r.la } : null;
}
