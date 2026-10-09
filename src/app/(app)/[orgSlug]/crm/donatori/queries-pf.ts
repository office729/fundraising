import { sql } from "drizzle-orm";

import { withOrgSession, type OrgContext } from "@/lib/auth/guard";
import { donCte, interogareContoare, interogareLista, parseFiltruPf, PRAGURI, SEGMENTE, type ContextPf, type RandDonator } from "@/lib/donatori-pf";

// Citirile CRM Persoane fizice: lista cu segmente/filtre și contoarele chip-urilor. Datele ajung la client ca JSON simplu (date = text ISO).

type Ctx = Pick<OrgContext, "db" | "orgId">;

const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : typeof v === "string" ? v : null);

export async function contextPf(ctx: Ctx): Promise<ContextPf> {
  const [imp] = (await ctx.db.execute(sql`select id::text as id, de::text as de from donatori_importuri where org_id = ${ctx.orgId} order by created_at desc limit 1`)) as unknown as { id: string; de: string | null }[];
  // „Ultimul val”: de la începutul ultimului import; fără importuri, ultimele N luni.
  const implicit = new Date(Date.now() - PRAGURI.valLuni * 30.4 * 86400000).toISOString().slice(0, 10);
  return { valDe: imp?.de ?? implicit, importNouId: imp?.id ?? null };
}

export type RandPf = Omit<RandDonator, "adaugat_la" | "sunat_la" | "multumit_la" | "prima" | "ultima" | "total"> & {
  adaugat_la: string | null;
  sunat_la: string | null;
  multumit_la: string | null;
  prima: string | null;
  ultima: string | null;
  total: number;
};

export function serializeazaRand(r: Record<string, unknown>): RandPf {
  const o = r as unknown as RandDonator;
  return {
    ...o,
    total: Number(o.total),
    adaugat_la: iso(o.adaugat_la as unknown),
    sunat_la: iso(o.sunat_la as unknown),
    multumit_la: iso(o.multumit_la as unknown),
    prima: iso(o.prima as unknown),
    ultima: iso(o.ultima as unknown),
    reapel_la: o.reapel_la ? String(o.reapel_la).slice(0, 10) : null,
    dezabonat_email_la: iso(o.dezabonat_email_la as unknown),
  };
}

export type ListaPf = {
  rows: RandPf[];
  total: number;
  suma: number;
  donatii: number;
  pagina: number;
  pageSize: number;
  pageCount: number;
  contoare: Record<string, number>;
  toti: number;
  proiecte: string[];
  ani: number[];
  importNouId: string | null;
  areDonatori: boolean;
};

export const getListaPf = withOrgSession(async (ctx, qs: string): Promise<ListaPf> => {
  const f = parseFiltruPf(new URLSearchParams(qs));
  const c = await contextPf(ctx);
  const [lista, contoareRand, optiuni] = await Promise.all([
    ctx.db.execute(interogareLista(ctx.orgId, f, c, { paginat: true })),
    ctx.db.execute(interogareContoare(ctx.orgId, f, c)),
    ctx.db.execute(sql`
      with ${donCte(ctx.orgId)},
      pr as (select proiect, count(*) as n from don where proiect is not null and proiect <> '' group by proiect order by n desc, proiect limit 300),
      an as (select distinct extract(year from min_d at time zone 'Europe/Bucharest')::int as an from (select email, min(data) as min_d from don group by email) x)
      select 'p' as t, proiect as v from pr union all select 'a', an::text from an`),
  ]);
  const randuri = lista as unknown as Record<string, unknown>[];
  const prim = randuri[0];
  const total = prim ? Number(prim._total) : 0;
  const contoare = (contoareRand as unknown as Record<string, number>[])[0] ?? {};
  const toti = Number(contoare.toti ?? 0);
  const out: Record<string, number> = {};
  for (const s of SEGMENTE) out[s.key] = s.top ? Math.min(s.top, toti) : Number(contoare[`s_${s.key}`] ?? 0);
  const opt = optiuni as unknown as { t: string; v: string }[];
  return {
    rows: randuri.map(serializeazaRand),
    total,
    suma: prim ? Number(prim._suma) : 0,
    donatii: prim ? Number(prim._donatii) : 0,
    pagina: f.pagina,
    pageSize: PRAGURI.pagina,
    pageCount: Math.max(1, Math.ceil(total / PRAGURI.pagina)),
    contoare: out,
    toti,
    proiecte: opt.filter((o) => o.t === "p").map((o) => o.v),
    ani: opt.filter((o) => o.t === "a").map((o) => Number(o.v)).sort((a, b) => b - a),
    importNouId: c.importNouId,
    areDonatori: toti > 0 || total > 0,
  };
});
