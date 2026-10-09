import { sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { bazaDonatori, contextPf, interogareContoare, parseFiltruPf, SEGMENTE } from "@/lib/donatori-pf";

type Ctx = Pick<OrgContext, "db" | "orgId">;

// Citirile pentru Acasă, Proiecte și Analize în CRM Persoane fizice. Toate pleacă din aceeași bază de donatori (vezi lib/donatori-pf.ts).
type Rand = Record<string, unknown>;
const n = (v: unknown) => Number(v ?? 0);
const iso = (v: unknown): string | null => (v instanceof Date ? v.toISOString() : typeof v === "string" ? v : null);

// ===== Acasă =====
export type AcasaPf = {
  kpi: { donatori: number; donatii: number; suma: number; lunari: number; recurenti: number; activi12: number };
  cohorte: { an: number; donatori: number; suma: number; activi: number }[];
  topProiecte: { proiect: string; donatori: number; donatii: number; total: number }[];
  todo: { desunat: number; demultumit: number; primadeconvertit: number; risc: number; dormanti: number; reapeluriScadente: number };
  reapeluri: { id: string; nume: string; email: string; reapelLa: string }[];
  feed: { actiune: string; la: string; autor: string | null; donator: string | null; donatorId: string | null; detalii: unknown }[];
};

export async function citesteAcasaPf(ctx: Ctx): Promise<AcasaPf> {
  const baza = bazaDonatori(ctx.orgId);
  const c = await contextPf(ctx);
  const [kpi, cohorte, proiecte, contoare, reapeluri, feed] = await Promise.all([
    ctx.db.execute(sql`with ${baza} select count(*)::int as donatori, coalesce(sum(nr), 0)::int as donatii, coalesce(sum(total), 0)::bigint as suma,
      count(*) filter (where lunar)::int as lunari, count(*) filter (where nr >= 2)::int as recurenti, count(*) filter (where ultima >= now() - interval '12 months')::int as activi12 from base`),
    ctx.db.execute(sql`with ${baza} select an, count(*)::int as donatori, coalesce(sum(total), 0)::bigint as suma, count(*) filter (where ultima >= now() - interval '12 months')::int as activi
      from base where an is not null group by an order by an desc limit 12`),
    ctx.db.execute(sql`with ${baza} select proiect, count(distinct email)::int as donatori, count(*)::int as donatii, sum(suma)::bigint as total from don where proiect is not null and proiect <> ''
      group by proiect order by total desc limit 8`),
    ctx.db.execute(interogareContoare(ctx.orgId, parseFiltruPf(new URLSearchParams()), c)),
    ctx.db.execute(sql`with ${baza} select id, nume, email, reapel_la::text as reapel_la from base where reapel_la is not null and reapel_la <= current_date + 7 order by reapel_la asc limit 10`),
    ctx.db.execute(sql`
      select a.actiune, a.created_at as la, coalesce(u.name, u.email) as autor, dr.nume as donator, dr.id::text as donator_id, a.detalii
      from fundraising_audit_log a
      left join app_users u on u.id = a.actor_app_user_id
      left join donatori_reali dr on dr.id::text = a.entitate_id::text and dr.org_id = a.org_id
      where a.org_id = ${ctx.orgId} and a.entitate in ('donator', 'import_donatori')
      order by a.created_at desc limit 15`),
  ]);
  const k = (kpi as unknown as Rand[])[0] ?? {};
  const ct = (contoare as unknown as Rand[])[0] ?? {};
  const due = (reapeluri as unknown as Rand[]).filter((r) => String(r.reapel_la) <= new Date().toISOString().slice(0, 10)).length;
  return {
    kpi: { donatori: n(k.donatori), donatii: n(k.donatii), suma: n(k.suma), lunari: n(k.lunari), recurenti: n(k.recurenti), activi12: n(k.activi12) },
    cohorte: (cohorte as unknown as Rand[]).map((r) => ({ an: n(r.an), donatori: n(r.donatori), suma: n(r.suma), activi: n(r.activi) })),
    topProiecte: (proiecte as unknown as Rand[]).map((r) => ({ proiect: String(r.proiect), donatori: n(r.donatori), donatii: n(r.donatii), total: n(r.total) })),
    todo: { desunat: n(ct.s_desunat), demultumit: n(ct.s_demultumit), primadeconvertit: n(ct.s_primadeconvertit), risc: n(ct.s_risc), dormanti: n(ct.s_dormanti), reapeluriScadente: due },
    reapeluri: (reapeluri as unknown as Rand[]).map((r) => ({ id: String(r.id), nume: String(r.nume), email: String(r.email), reapelLa: String(r.reapel_la).slice(0, 10) })),
    feed: (feed as unknown as Rand[]).map((r) => ({ actiune: String(r.actiune), la: iso(r.la) ?? "", autor: (r.autor as string) ?? null, donator: (r.donator as string) ?? null, donatorId: (r.donator_id as string) ?? null, detalii: r.detalii })),
  };
}

// ===== Proiecte =====
export type RandProiect = {
  proiect: string;
  donatori: number;
  donatii: number;
  total: number;
  recurenti: number; // donatori cu cel puțin 2 donații la acest proiect
  atrasi: number; // donatori al căror PRIM proiect e acesta
  atrasiCareAuMaiDonat: number;
  sumaInAlteProiecte: number; // ce au donat atrașii în ALTE proiecte
  maxDonatie: number;
};

export async function citesteProiectePf(ctx: Ctx): Promise<RandProiect[]> {
  const r = await ctx.db.execute(sql`
    with ${bazaDonatori(ctx.orgId)},
    pp as (select email, proiect, count(*)::int as nr, sum(suma)::bigint as total, max(suma) as mx from don where proiect is not null and proiect <> '' group by email, proiect),
    tot as (select email, sum(total)::bigint as total_all from pp group by email),
    per_p as (select proiect, count(*)::int as donatori, sum(nr)::int as donatii, sum(total)::bigint as total, count(*) filter (where nr >= 2)::int as recurenti, max(mx) as mx from pp group by proiect),
    atrasi as (
      select a.primul_proiect as proiect, count(*)::int as atrasi,
             count(*) filter (where coalesce(t.total_all, 0) - coalesce(p.total, 0) > 0)::int as au_mai_donat,
             coalesce(sum(coalesce(t.total_all, 0) - coalesce(p.total, 0)), 0)::bigint as suma_alte
      from agg a left join tot t on t.email = a.email left join pp p on p.email = a.email and p.proiect = a.primul_proiect
      where a.primul_proiect is not null group by a.primul_proiect
    )
    select per_p.proiect, per_p.donatori, per_p.donatii, per_p.total, per_p.recurenti, per_p.mx as max_donatie,
           coalesce(atrasi.atrasi, 0)::int as atrasi, coalesce(atrasi.au_mai_donat, 0)::int as au_mai_donat, coalesce(atrasi.suma_alte, 0)::bigint as suma_alte
    from per_p left join atrasi on atrasi.proiect = per_p.proiect
    order by per_p.total desc limit 500`);
  return (r as unknown as Rand[]).map((x) => ({
    proiect: String(x.proiect), donatori: n(x.donatori), donatii: n(x.donatii), total: n(x.total), recurenti: n(x.recurenti), atrasi: n(x.atrasi),
    atrasiCareAuMaiDonat: n(x.au_mai_donat), sumaInAlteProiecte: n(x.suma_alte), maxDonatie: n(x.max_donatie),
  }));
}

// ===== Analize =====
export type AnalizePf = {
  churn: { abonati: number; dezabonati: number; rata: number; sumaPierduta: number; dezabonatiRecurenti: number; dezabonatiLunari: number; faraConsimtamant: number; lunar: { luna: string; n: number }[] };
  lapse: { id: string; nume: string; email: string; nr: number; total: number; ultima: string | null; intervalMediu: number; zileDeLaUltima: number; scor: number; wbStage: string | null }[];
  winback: { reactivare: number; reactivat: number; pierdut: number; rata: number | null };
  radar: { key: string; count: number; valoare: number }[];
  rfm: { r: number; f: number; n: number; suma: number }[];
  cohorte: { an: number; donatori: number; pe: Record<number, number> }[];
};

export async function citesteAnalizePf(ctx: Ctx): Promise<AnalizePf> {
  const baza = bazaDonatori(ctx.orgId);
  const c = await contextPf(ctx);
  const radarChei = SEGMENTE.filter((s) => s.grup === "radar" && s.sql);
  const radarColoane = radarChei.flatMap((s) => [sql`count(*) filter (where ${s.sql!(c)})::int as ${sql.raw(`c_${s.key}`)}`, sql`coalesce(sum(total) filter (where ${s.sql!(c)}), 0)::bigint as ${sql.raw(`v_${s.key}`)}`]);
  const [churn, trend, lapse, wb, radar, rfm, coh] = await Promise.all([
    ctx.db.execute(sql`with ${baza} select
      count(*) filter (where consimtamant_email is not false and dezabonat_email_la is null)::int as abonati,
      count(*) filter (where dezabonat_email_la is not null)::int as dezabonati,
      coalesce(sum(total) filter (where dezabonat_email_la is not null), 0)::bigint as suma,
      count(*) filter (where dezabonat_email_la is not null and nr >= 2)::int as dez_rec,
      count(*) filter (where dezabonat_email_la is not null and lunar)::int as dez_lunari,
      count(*) filter (where consimtamant_email is false)::int as fara from base`),
    ctx.db.execute(sql`with ${baza} select to_char(date_trunc('month', dezabonat_email_la), 'YYYY-MM') as luna, count(*)::int as n from base
      where dezabonat_email_la >= now() - interval '12 months' group by 1 order by 1`),
    ctx.db.execute(sql`with ${baza} select id, nume, email, nr, total, ultima, wb_stage,
        extract(epoch from (ultima - prima)) / 86400.0 / nullif(nr - 1, 0) as interval_mediu, extract(epoch from (now() - ultima)) / 86400.0 as zile
      from base where nr >= 2 and not lunar and ultima >= now() - interval '36 months' and coalesce(wb_stage, '') <> 'reactivat'
      order by total desc limit 400`),
    ctx.db.execute(sql`with ${baza} select wb_stage, count(*)::int as n from base where wb_stage is not null group by wb_stage`),
    ctx.db.execute(sql`with ${baza} select ${sql.join(radarColoane, sql`, `)} from base b`),
    ctx.db.execute(sql`with ${baza} select r, f, count(*)::int as n, coalesce(sum(total), 0)::bigint as suma from (
        select total,
          case when ultima >= now() - interval '6 months' then 1 when ultima >= now() - interval '12 months' then 2 when ultima >= now() - interval '24 months' then 3 else 4 end as r,
          case when nr = 1 then 1 when nr = 2 then 2 when nr <= 4 then 3 else 4 end as f
        from base where nr >= 1) x group by r, f`),
    ctx.db.execute(sql`with ${baza},
      yr as (select email, extract(year from data at time zone 'Europe/Bucharest')::int as y from don group by 1, 2)
      select b.an as cohorta, yr.y as anul, count(*)::int as n from base b join yr on yr.email = lower(b.email) where b.an is not null group by 1, 2`),
  ]);
  const ch = (churn as unknown as Rand[])[0] ?? {};
  const abonati = n(ch.abonati);
  const dezabonati = n(ch.dezabonati);

  const lapseRows = (lapse as unknown as Rand[])
    .map((r) => {
      const interval = Math.max(7, n(r.interval_mediu));
      const raport = n(r.zile) / interval;
      return { r, raport, scor: raport >= 1 ? Math.max(0, Math.min(100, Math.round((raport - 1) * 40 + 20))) : 0 };
    })
    .filter((x) => x.raport >= 1.5)
    .sort((a, b) => b.scor - a.scor || n(b.r.total) - n(a.r.total))
    .slice(0, 60)
    .map(({ r, scor }) => ({
      id: String(r.id), nume: String(r.nume), email: String(r.email), nr: n(r.nr), total: n(r.total), ultima: iso(r.ultima), intervalMediu: Math.round(n(r.interval_mediu)),
      zileDeLaUltima: Math.round(n(r.zile)), scor, wbStage: (r.wb_stage as string) ?? null,
    }));

  const wbm = new Map((wb as unknown as Rand[]).map((r) => [String(r.wb_stage), n(r.n)]));
  const reactivat = wbm.get("reactivat") ?? 0;
  const pierdut = wbm.get("pierdut") ?? 0;
  const rr = (radar as unknown as Rand[])[0] ?? {};

  const matrice = new Map<number, { donatori: number; pe: Record<number, number> }>();
  for (const x of coh as unknown as Rand[]) {
    const a = n(x.cohorta);
    const m = matrice.get(a) ?? { donatori: 0, pe: {} };
    m.pe[n(x.anul)] = n(x.n);
    if (n(x.anul) === a) m.donatori = n(x.n);
    matrice.set(a, m);
  }
  return {
    churn: {
      abonati, dezabonati, rata: abonati + dezabonati > 0 ? dezabonati / (abonati + dezabonati) : 0, sumaPierduta: n(ch.suma), dezabonatiRecurenti: n(ch.dez_rec), dezabonatiLunari: n(ch.dez_lunari), faraConsimtamant: n(ch.fara),
      lunar: (trend as unknown as Rand[]).map((t) => ({ luna: String(t.luna), n: n(t.n) })),
    },
    lapse: lapseRows,
    winback: { reactivare: wbm.get("reactivare") ?? 0, reactivat, pierdut, rata: reactivat + pierdut > 0 ? reactivat / (reactivat + pierdut) : null },
    radar: radarChei.map((s) => ({ key: s.key, count: n(rr[`c_${s.key}`]), valoare: n(rr[`v_${s.key}`]) })),
    rfm: (rfm as unknown as Rand[]).map((x) => ({ r: n(x.r), f: n(x.f), n: n(x.n), suma: n(x.suma) })),
    cohorte: [...matrice.entries()].sort((a, b) => b[0] - a[0]).map(([an, m]) => ({ an, donatori: m.donatori, pe: m.pe })),
  };
}
