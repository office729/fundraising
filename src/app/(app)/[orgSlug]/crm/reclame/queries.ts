import "server-only";

import { sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { plasamentDinSursa } from "@/lib/reclame/atribuire";
import type { LegaturaCampanie, RandCostAgg, RandDonatieAgg } from "@/lib/reclame/raport";

// Interogările modulului „Performanța reclamelor”. Rulează pe `ctx.db` (izolat pe organizație prin RLS); org_id e filtrat și explicit.
// Donațiile se numără doar când sunt confirmate (reusita) sau confirmate și apoi rambursate integral (rambursata): o donație „in_asteptare” sau „esuata”
// nu intră niciodată. Ziua se calculează în ora României.

const N = (x: unknown): number => (x === null || x === undefined ? 0 : Number(x));
const NN = (x: unknown): number | null => (x === null || x === undefined ? null : Number(x));
const rows = <T,>(r: unknown): T[] => r as T[];

const ZI_DONATIE = sql`(d.created_at at time zone 'Europe/Bucharest')::date`;
const CONFIRMATA = sql`d.status in ('reusita', 'rambursata')`;

export async function costuriPeriodei(ctx: OrgContext, de: string, pana: string): Promise<RandCostAgg[]> {
  const r = await ctx.db.execute(sql`
    select platforma, plasament, ziua::text as ziua, campanie_cheie, max(campanie_nume) as campanie_nume,
           sum(cheltuiala_ron_minor)::bigint as cost, sum(afisari)::bigint as afisari, sum(clicuri_link)::bigint as clicuri
    from reclame_costuri
    where org_id = ${ctx.orgId} and ziua between ${de}::date and ${pana}::date
    group by platforma, plasament, ziua, campanie_cheie
  `);
  return rows<{ platforma: string; plasament: string; ziua: string; campanie_cheie: string; campanie_nume: string; cost: string; afisari: string | null; clicuri: string | null }>(r).map((x) => ({
    platforma: x.platforma,
    plasament: x.plasament,
    ziua: x.ziua,
    campanieCheie: x.campanie_cheie,
    campanieNume: x.campanie_nume,
    costBani: N(x.cost),
    afisari: NN(x.afisari),
    clicuri: NN(x.clicuri),
  }));
}

// Donații confirmate atribuite reclamelor plătite, în fereastra de atribuire aleasă (zile între clic și donație), pe zi/platformă/cod campanie/tip donator.
// „Nou” = niciun alt rând confirmat anterior cu același e-mail în organizație; fără e-mail, donatorul rămâne neclasificat.
export async function donatiiAtribuite(ctx: OrgContext, de: string, pana: string, fereastraZile: number): Promise<RandDonatieAgg[]> {
  const r = await ctx.db.execute(sql`
    select ${ZI_DONATIE}::text as ziua, a.platforma, a.utm_source, a.utm_campaign,
           case when coalesce(d.email_donator, '') = '' then 'necl'
                when exists (
                  select 1 from fundraising_donations p
                  where p.org_id = d.org_id and lower(p.email_donator) = lower(d.email_donator)
                    and p.status in ('reusita', 'rambursata') and p.created_at < d.created_at and p.id <> d.id
                ) then 'existent'
                else 'nou' end as clasa_donator,
           count(*)::int as n, (sum(d.suma) * 100)::bigint as brut, (sum(d.suma_rambursata) * 100)::bigint as rambursat
    from fundraising_donations d
    join donatie_atribuiri a on a.donatie_id = d.id
    where d.org_id = ${ctx.orgId} and a.clasa = 'platita' and ${CONFIRMATA}
      and ${ZI_DONATIE} between ${de}::date and ${pana}::date
      and a.click_la is not null
      and d.created_at >= a.click_la - interval '5 minutes'
      and d.created_at - a.click_la <= make_interval(days => ${fereastraZile}::int)
    group by 1, 2, 3, 4, 5
  `);
  return rows<{ ziua: string; platforma: string | null; utm_source: string | null; utm_campaign: string | null; clasa_donator: "nou" | "existent" | "necl"; n: number; brut: string; rambursat: string }>(r).map((x) => ({
    ziua: x.ziua,
    platforma: x.platforma,
    plasament: plasamentDinSursa(x.utm_source),
    utmCampanie: x.utm_campaign,
    clasaDonator: x.clasa_donator,
    n: N(x.n),
    brutBani: N(x.brut),
    rambursatBani: N(x.rambursat),
  }));
}

// Cât s-a încasat DUPĂ prima plată de la abonamentele atribuite (reînnoiri), separat de donațiile inițiale; reînnoirile nu primesc atribuire proprie.
export async function reinnoiriAbonamenteAtribuite(ctx: OrgContext, de: string, pana: string, fereastraZile: number): Promise<{ abonamente: number; incasatBani: number }> {
  const r = await ctx.db.execute(sql`
    select count(distinct d.id)::int as abonamente, (coalesce(sum(r.suma - r.suma_rambursata), 0) * 100)::bigint as incasat
    from fundraising_donations d
    join donatie_atribuiri a on a.donatie_id = d.id
    left join fundraising_donations r
      on r.stripe_subscription_id = d.stripe_subscription_id and r.id <> d.id and r.status = 'reusita' and r.created_at > d.created_at
    where d.org_id = ${ctx.orgId} and d.recurenta and d.stripe_subscription_id is not null and a.clasa = 'platita' and ${CONFIRMATA}
      and ${ZI_DONATIE} between ${de}::date and ${pana}::date
      and a.click_la is not null and d.created_at >= a.click_la - interval '5 minutes'
      and d.created_at - a.click_la <= make_interval(days => ${fereastraZile}::int)
  `);
  const x = rows<{ abonamente: number; incasat: string }>(r)[0];
  return { abonamente: N(x?.abonamente), incasatBani: N(x?.incasat) };
}

export type Parcurs = { vizitatori: number; deschideri: number; incercari: number; confirmate: number };

// Parcursul observat pentru traficul din campaniile legate de un cod UTM: vizitatori pe zi (amprentă zilnică, fără cookie-uri) → formular deschis →
// încercări de donație (rânduri create înainte de procesator) → plăți confirmate. Unitățile diferă (vizitatori-zi vs donații), deci pașii nu sunt o cohortă strictă.
export async function parcursObservat(ctx: OrgContext, de: string, pana: string): Promise<Parcurs> {
  // Doar traficul și donațiile al căror cod UTM e legat de o campanie publicitară (deci reclame cunoscute).
  const legat = (coloana: string) => sql`exists (select 1 from reclame_campanii c where c.org_id = ${ctx.orgId} and c.utm_campanie = ${sql.raw(coloana)})`;
  const ev = await ctx.db.execute(sql`
    select e.tip, count(distinct (e.ziua::text || e.vizitator))::int as n
    from campaign_page_events e
    where e.org_id = ${ctx.orgId} and e.ziua between ${de}::date and ${pana}::date and e.utm_campanie is not null
      and ${legat("e.utm_campanie")}
    group by e.tip
  `);
  const evr = rows<{ tip: string; n: number }>(ev);
  const at = await ctx.db.execute(sql`
    select count(*)::int as incercari, (count(*) filter (where ${CONFIRMATA}))::int as confirmate
    from donatie_atribuiri a join fundraising_donations d on d.id = a.donatie_id
    where a.org_id = ${ctx.orgId} and a.clasa = 'platita' and a.utm_campaign is not null
      and ${legat("a.utm_campaign")}
      and ${ZI_DONATIE} between ${de}::date and ${pana}::date
  `);
  const a = rows<{ incercari: number; confirmate: number }>(at)[0];
  return {
    vizitatori: N(evr.find((x) => x.tip === "vizita")?.n),
    deschideri: N(evr.find((x) => x.tip === "deschide_donatia")?.n),
    incercari: N(a?.incercari),
    confirmate: N(a?.confirmate),
  };
}

export type CalitateDate = {
  donatiiConfirmate: number;
  cuAtribuire: number; // au un context (orice clasă); restul sunt directe sau fără context
  platiteFaraCostLegat: number;
  surse: { platforma: string; ultimaZi: string | null; actualizatLa: string | null }[];
};

export async function calitateDate(ctx: OrgContext, de: string, pana: string): Promise<CalitateDate> {
  const d = await ctx.db.execute(sql`
    select (count(*) filter (where ${CONFIRMATA}))::int as confirmate,
           (count(*) filter (where ${CONFIRMATA} and a.donatie_id is not null))::int as cu_atribuire,
           (count(*) filter (where ${CONFIRMATA} and a.clasa = 'platita' and (a.utm_campaign is null or not exists (
              select 1 from reclame_campanii c where c.org_id = d.org_id and c.utm_campanie = a.utm_campaign))))::int as platite_nelegate
    from fundraising_donations d left join donatie_atribuiri a on a.donatie_id = d.id
    where d.org_id = ${ctx.orgId} and ${ZI_DONATIE} between ${de}::date and ${pana}::date
  `);
  const s = await ctx.db.execute(sql`
    select platforma, max(ziua)::text as ultima_zi, max(actualizat_la) as actualizat
    from reclame_costuri where org_id = ${ctx.orgId} group by platforma order by platforma
  `);
  const x = rows<{ confirmate: number; cu_atribuire: number; platite_nelegate: number }>(d)[0];
  return {
    donatiiConfirmate: N(x?.confirmate),
    cuAtribuire: N(x?.cu_atribuire),
    platiteFaraCostLegat: N(x?.platite_nelegate),
    surse: rows<{ platforma: string; ultima_zi: string | null; actualizat: string | Date | null }>(s).map((r) => ({
      platforma: r.platforma,
      ultimaZi: r.ultima_zi,
      actualizatLa: r.actualizat ? new Date(r.actualizat).toISOString() : null,
    })),
  };
}

export async function legaturiCampanii(ctx: OrgContext): Promise<LegaturaCampanie[]> {
  const r = await ctx.db.execute(sql`select platforma, campanie_cheie, campanie_nume, utm_campanie from reclame_campanii where org_id = ${ctx.orgId} order by platforma, campanie_nume`);
  return rows<{ platforma: string; campanie_cheie: string; campanie_nume: string; utm_campanie: string | null }>(r).map((x) => ({
    platforma: x.platforma,
    campanieCheie: x.campanie_cheie,
    campanieNume: x.campanie_nume,
    utmCampanie: x.utm_campanie,
  }));
}
