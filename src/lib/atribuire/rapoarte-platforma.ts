import "server-only";

import { sql, type SQL } from "drizzle-orm";

import { db } from "@/lib/db";

import { esteCanal, esteTip, type Canal, type TipPromovare } from "./clasificare";
import { esteModel, type ModelAtribuire } from "./model";
import { filtreDinParametri, ziuaRoJs } from "./rapoarte";

// „De unde vin ONG-urile”: provenința vizitatorilor site-ului platformei, a cererilor „Descoperă Alexandrit” și a conturilor create. Doar echipa platformei.
// Sursele sunt cele ale sesiunii vizitatorului pe site-ul public; conversiile (lead, cont creat) au instantaneul de atribuire salvat în clipa lor.
// Conturile create înainte de activarea măsurării nu au sursă: apar separat, ca „fără atribuire”.

export type FiltrePlatforma = { de: string; pana: string; model: ModelAtribuire; sursa: string | null; canal: Canal | null; tip: TipPromovare | null };

export function filtrePlatformaDinParametri(sp: Record<string, string | string[] | undefined>): FiltrePlatforma {
  const f = filtreDinParametri(sp);
  const unu = (k: string) => {
    const v = sp[k];
    const t = Array.isArray(v) ? v[0] : v;
    return typeof t === "string" ? t : null;
  };
  const model = unu("model");
  return { de: f.de, pana: f.pana, model: esteModel(model) ? model : "ultima", sursa: f.sursa, canal: f.canal, tip: f.tip };
}

const coloane = (m: ModelAtribuire) => {
  if (m === "prima") return { sursa: sql.raw("c.prima_sursa"), canal: sql.raw("c.prima_canal"), tip: sql.raw("c.prima_tip"), camp: sql.raw("c.prima_campanie") };
  if (m === "sesiune") return { sursa: sql.raw("c.ses_sursa"), canal: sql.raw("c.ses_canal"), tip: sql.raw("c.ses_tip"), camp: sql.raw("c.ses_campanie") };
  return { sursa: sql.raw("coalesce(c.ult_sursa, c.ses_sursa)"), canal: sql.raw("coalesce(c.ult_canal, c.ses_canal)"), tip: sql.raw("coalesce(c.ult_tip, c.ses_tip)"), camp: sql.raw("coalesce(c.ult_campanie, c.ses_campanie)") };
};

export type RandPlatforma = {
  sursa: string;
  canal: Canal;
  tip: TipPromovare;
  campanie: string;
  vizitatori: number;
  sesiuni: number;
  leaduri: number;
  leaduriInscrise: number;
  conturi: number;
  trial: number;
  start: number;
  crestere: number;
  impact: number;
  custom: number;
};
export type ContNou = { orgId: string; nume: string; slug: string; pachet: string; creatLa: string; sursa: string | null; canal: Canal | null; tip: TipPromovare | null; campanie: string; recomandat: boolean };
export type RaportPlatforma = {
  filtre: FiltrePlatforma;
  vizitatori: number;
  sesiuni: number;
  fracFaraAcord: number | null;
  leaduri: number;
  conturi: number;
  conturiFaraAtribuire: number;
  conturiPrinRecomandare: number;
  perTip: { tip: TipPromovare; vizitatori: number; leaduri: number; conturi: number }[];
  perPachet: { pachet: string; conturi: number }[];
  serie: { ziua: string; vizitatori: number; leaduri: number; conturi: number }[];
  tabel: RandPlatforma[];
  conturiNoi: ContNou[];
};

const gol = (p: Partial<RandPlatforma>): RandPlatforma => ({ sursa: "", canal: "direct", tip: "nedeterminat", campanie: "", vizitatori: 0, sesiuni: 0, leaduri: 0, leaduriInscrise: 0, conturi: 0, trial: 0, start: 0, crestere: 0, impact: 0, custom: 0, ...p });

export async function incarcaPlatforma(f: FiltrePlatforma): Promise<RaportPlatforma> {
  return db.transaction(async (tx) => {
    // Citim ca echipa platformei (rândurile fără organizație ale tabelelor de provenință) și rezolvăm organizațiile create (public_lookup).
    await tx.execute(sql`select set_config('app.platform_admin', 'true', true)`);
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const m = coloane(f.model);
    const wEv: SQL[] = [sql`e.org_id is null`, sql`e.flux = 'platforma'`, sql`e.ziua >= ${f.de}::date`, sql`e.ziua <= ${f.pana}::date`];
    if (f.sursa) wEv.push(sql`e.sursa = ${f.sursa}`);
    if (f.canal) wEv.push(sql`e.canal = ${f.canal}`);
    if (f.tip) wEv.push(sql`e.tip_promovare = ${f.tip}`);
    const wConv = (tip: string): SQL => {
      const p: SQL[] = [sql`c.org_id is null`, sql`c.tip = ${tip}`, sql`(timezone('Europe/Bucharest', c.conversie_la))::date >= ${f.de}::date`, sql`(timezone('Europe/Bucharest', c.conversie_la))::date <= ${f.pana}::date`];
      if (f.sursa) p.push(sql`${m.sursa} = ${f.sursa}`);
      if (f.canal) p.push(sql`${m.canal} = ${f.canal}`);
      if (f.tip) p.push(sql`${m.tip} = ${f.tip}`);
      return sql.join(p, sql` and `);
    };

    type Cheie = { k1: string; k2: string; k3: string; k4: string };
    const vizite = await tx.execute<Cheie & { vizitatori: number; sesiuni: number; fara_acord: number }>(sql`
      select e.sursa as k1, e.canal as k2, e.tip_promovare as k3, coalesce(e.campanie_marketing, '') as k4,
        count(distinct e.vizitator_id) filter (where e.tip = 'vizita')::int as vizitatori,
        count(distinct e.vizitator_id || '/' || e.sesiune_id) filter (where e.tip = 'vizita')::int as sesiuni,
        count(distinct e.vizitator_id) filter (where e.tip = 'vizita' and not e.persistent)::int as fara_acord
      from atrib_evenimente e where ${sql.join(wEv, sql` and `)} group by 1, 2, 3, 4`);
    const totalVizite = await tx.execute<{ vizitatori: number; sesiuni: number; fara_acord: number }>(sql`
      select count(distinct e.vizitator_id) filter (where e.tip = 'vizita')::int as vizitatori,
        count(distinct e.vizitator_id || '/' || e.sesiune_id) filter (where e.tip = 'vizita')::int as sesiuni,
        count(distinct e.vizitator_id) filter (where e.tip = 'vizita' and not e.persistent)::int as fara_acord
      from atrib_evenimente e where ${sql.join(wEv, sql` and `)}`);
    const leaduri = await tx.execute<Cheie & { n: number; inscrise: number }>(sql`
      select ${m.sursa} as k1, ${m.canal} as k2, ${m.tip} as k3, coalesce(${m.camp}, '') as k4,
        count(*)::int as n, count(*) filter (where l.stare = 'inscris')::int as inscrise
      from atrib_conversii c join interese_ong l on l.id = c.entitate_id
      where ${wConv("lead")} group by 1, 2, 3, 4`);
    const conturi = await tx.execute<Cheie & { n: number; trial: number; start: number; crestere: number; impact: number; custom: number }>(sql`
      select ${m.sursa} as k1, ${m.canal} as k2, ${m.tip} as k3, coalesce(${m.camp}, '') as k4,
        count(*)::int as n,
        count(*) filter (where o.package = 'trial')::int as trial, count(*) filter (where o.package = 'start')::int as start,
        count(*) filter (where o.package = 'crestere')::int as crestere, count(*) filter (where o.package = 'impact')::int as impact,
        count(*) filter (where o.package = 'custom')::int as custom
      from atrib_conversii c join organizations o on o.id = c.entitate_id
      where ${wConv("cont")} group by 1, 2, 3, 4`);

    const harta = new Map<string, RandPlatforma>();
    const ia = (x: Cheie) => {
      const k = `${x.k1}\u0001${x.k2}\u0001${x.k3}\u0001${x.k4}`;
      let r = harta.get(k);
      if (!r) harta.set(k, (r = gol({ sursa: x.k1, canal: esteCanal(x.k2) ? x.k2 : "altele", tip: esteTip(x.k3) ? x.k3 : "nedeterminat", campanie: x.k4 })));
      return r;
    };
    for (const v of vizite) {
      const r = ia(v);
      r.vizitatori += v.vizitatori;
      r.sesiuni += v.sesiuni;
    }
    for (const l of leaduri) {
      const r = ia(l);
      r.leaduri += l.n;
      r.leaduriInscrise += l.inscrise;
    }
    for (const c of conturi) {
      const r = ia(c);
      r.conturi += c.n;
      r.trial += c.trial;
      r.start += c.start;
      r.crestere += c.crestere;
      r.impact += c.impact;
      r.custom += c.custom;
    }
    const tabel = [...harta.values()].sort((a, b) => b.conturi * 100 + b.leaduri * 10 + b.vizitatori - (a.conturi * 100 + a.leaduri * 10 + a.vizitatori)).slice(0, 300);

    const perTip = (["organic", "platit", "nedeterminat"] as TipPromovare[]).map((tip) => {
      const r = tabel.filter((x) => x.tip === tip);
      return { tip, vizitatori: r.reduce((s, x) => s + x.vizitatori, 0), leaduri: r.reduce((s, x) => s + x.leaduri, 0), conturi: r.reduce((s, x) => s + x.conturi, 0) };
    });
    const perPachet = (["trial", "start", "crestere", "impact", "custom"] as const).map((pachet) => ({ pachet, conturi: tabel.reduce((s, x) => s + x[pachet], 0) }));

    const zi = await tx.execute<{ ziua: string; vizitatori: number; leaduri: number; conturi: number }>(sql`
      select z.ziua, coalesce(v.n, 0)::int as vizitatori, coalesce(l.n, 0)::int as leaduri, coalesce(k.n, 0)::int as conturi
      from (select to_char(d, 'YYYY-MM-DD') as ziua from generate_series(${f.de}::date, ${f.pana}::date, interval '1 day') d) z
      left join (select e.ziua::text as ziua, count(distinct e.vizitator_id)::int as n from atrib_evenimente e where ${sql.join(wEv, sql` and `)} and e.tip = 'vizita' group by 1) v on v.ziua = z.ziua
      left join (select (timezone('Europe/Bucharest', c.conversie_la))::date::text as ziua, count(*)::int as n from atrib_conversii c where ${wConv("lead")} group by 1) l on l.ziua = z.ziua
      left join (select (timezone('Europe/Bucharest', c.conversie_la))::date::text as ziua, count(*)::int as n from atrib_conversii c where ${wConv("cont")} group by 1) k on k.ziua = z.ziua
      order by z.ziua`);

    // Conturi create în perioadă (toate, cu sau fără sursă) și câte au venit prin codul de recomandare.
    const noi = await tx.execute<{ id: string; name: string; slug: string; package: string; created_at: string; referred: boolean; sursa: string | null; canal: string | null; tip: string | null; camp: string | null }>(sql`
      select o.id, o.name, o.slug, o.package::text as package, o.created_at::text as created_at, (o.referred_by_org_id is not null) as referred,
        ${m.sursa} as sursa, ${m.canal} as canal, ${m.tip} as tip, ${m.camp} as camp
      from organizations o
      left join atrib_conversii c on c.tip = 'cont' and c.entitate_id = o.id and c.org_id is null
      where (timezone('Europe/Bucharest', o.created_at))::date >= ${f.de}::date and (timezone('Europe/Bucharest', o.created_at))::date <= ${f.pana}::date
      order by o.created_at desc limit 100`);
    const conturiNoi: ContNou[] = [...noi].map((o) => ({
      orgId: o.id,
      nume: o.name,
      slug: o.slug,
      pachet: o.package,
      creatLa: o.created_at,
      sursa: o.sursa,
      canal: o.canal && esteCanal(o.canal) ? o.canal : null,
      tip: o.tip && esteTip(o.tip) ? o.tip : null,
      campanie: o.camp ?? "",
      recomandat: o.referred,
    }));
    const [{ n: totalConturi, fara: faraAtribuire, rec }] = await tx.execute<{ n: number; fara: number; rec: number }>(sql`
      select count(*)::int as n,
        count(*) filter (where not exists (select 1 from atrib_conversii c where c.tip = 'cont' and c.entitate_id = o.id and c.org_id is null))::int as fara,
        count(*) filter (where o.referred_by_org_id is not null)::int as rec
      from organizations o
      where (timezone('Europe/Bucharest', o.created_at))::date >= ${f.de}::date and (timezone('Europe/Bucharest', o.created_at))::date <= ${f.pana}::date`);

    const tv = totalVizite[0] ?? { vizitatori: 0, sesiuni: 0, fara_acord: 0 };
    return {
      filtre: f,
      vizitatori: tv.vizitatori,
      sesiuni: tv.sesiuni,
      fracFaraAcord: tv.vizitatori > 0 ? (tv.fara_acord / tv.vizitatori) * 100 : null,
      leaduri: tabel.reduce((s, x) => s + x.leaduri, 0),
      conturi: totalConturi,
      conturiFaraAtribuire: faraAtribuire,
      conturiPrinRecomandare: rec,
      perTip,
      perPachet,
      serie: [...zi],
      tabel,
      conturiNoi,
    };
  });
}

export const ziuaImplicita = ziuaRoJs;
