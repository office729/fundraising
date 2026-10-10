import { sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { donCte } from "@/lib/donatori-pf";

import type { AnStat, BazaStat, DateAvatare, GrupCod, GrupStat } from "./avatare-reale";

// Citește din baza de date DOAR cifre agregate (numărătoare, sume, mediane) pe grupuri comportamentale. Nu întoarce nume, emailuri,
// telefoane sau alte date ale unei persoane. Baza e aceeași ca în CRM Persoane fizice (donCte): donații online reușite, înregistrate
// manual și importate, nete de rambursări.
//
// Gruparea (mutual exclusivă, primul care se potrivește câștigă) — aceleași reguli ca în „Segmente de donatori”:
//   recurent: abonament lunar activ · pauza: ultima donație acum >6 luni · major: top 10% după suma donată (cu ≥10 donatori în bază)
//   nou: o singură donație · fidel: 2+ donații, ultima în ultimele 6 luni.
// (Ordinea diferă puțin de segmentele din pagina de segmente: aici „pauza” înglobează „în risc” și „inactiv”, ca să existe cel mult 5 grupuri.)

type Rand = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);

export async function obtineDateAvatare(db: OrgContext["db"], orgId: string, canaleIntroduse: boolean): Promise<DateAvatare> {
  const baza = sql`
    ${donCte(orgId)},
    agg as (
      select email, sum(suma)::bigint as total, count(*)::int as nr, min(data) as prima, max(data) as ultima
      from don group by email
    ),
    abon as (
      select distinct lower(email_donator) as email from fundraising_donations
      where org_id = ${orgId} and recurenta and abonament_activ and email_donator is not null
    ),
    b as (
      select lower(dr.email) as email, dr.sursa, dr.consimtamant_email, dr.dezabonat_email_la,
             a.total, a.nr, a.prima, a.ultima, (ab.email is not null) as lunar
      from donatori_reali dr
      join agg a on a.email = lower(dr.email)
      left join abon ab on ab.email = lower(dr.email)
      where dr.org_id = ${orgId}
    ),
    p as (select coalesce(percentile_cont(0.9) within group (order by total), 0) as p90, count(*) as n from b),
    g as (
      select b.*,
        case
          when b.lunar then 'recurent'
          when b.ultima < now() - interval '6 months' then 'pauza'
          when p.n >= 10 and b.total > 0 and b.total >= p.p90 then 'major'
          when b.nr <= 1 then 'nou'
          else 'fidel'
        end as grup
      from b cross join p
    )`;

  const [grupuri, proiecte, general, ani, surse] = await Promise.all([
    db.execute(sql`
      with ${baza}
      select grup, count(*)::int as nr, coalesce(sum(total), 0)::bigint as suma,
        coalesce(percentile_cont(0.5) within group (order by total), 0)::float as mediana_total,
        coalesce(avg(nr), 0)::float as medie_donatii,
        coalesce(percentile_cont(0.5) within group (order by extract(epoch from (now() - ultima)) / 86400.0), 0)::float as mediana_recenta,
        percentile_cont(0.5) within group (order by extract(epoch from (ultima - prima)) / 86400.0 / nullif(nr - 1, 0)) filter (where nr >= 2) as mediana_interval,
        count(*) filter (where nr >= 2)::int as cu_interval,
        count(*) filter (where consimtamant_email is true and dezabonat_email_la is null)::int as cu_email,
        count(*) filter (where dezabonat_email_la is not null)::int as dezabonati,
        count(*) filter (where grup = 'pauza' and ultima >= now() - interval '12 months')::int as risc_luni,
        count(*) filter (where grup = 'pauza' and ultima < now() - interval '12 months')::int as inactivi
      from g group by grup`),
    db.execute(sql`
      with ${baza}
      select g.grup, d.proiect as titlu, count(distinct d.email)::int as donatori
      from don d join g on g.email = d.email
      where d.proiect is not null and d.proiect <> ''
      group by g.grup, d.proiect
      having count(distinct d.email) >= 3
      order by g.grup, donatori desc`),
    db.execute(sql`
      with ${baza},
      mediana as (select coalesce(percentile_cont(0.5) within group (order by suma), 0)::float as m from don),
      elig as (select count(*)::int as n, count(*) filter (where nr >= 2)::int as repetat from b where prima < now() - interval '6 months'),
      ant as (select distinct email from don where data >= now() - interval '24 months' and data < now() - interval '12 months'),
      rec as (select distinct email from don where data >= now() - interval '12 months')
      select (select count(*) from b)::int as donatori,
             (select coalesce(sum(total), 0) from b)::bigint as suma,
             (select m from mediana) as mediana_donatie,
             (select count(*) from b where lunar)::int as recurenti,
             (select n from elig) as elig_n, (select repetat from elig) as elig_repetat,
             (select count(*) from ant)::int as ret_baza,
             (select count(*) from ant join rec using (email))::int as ret_ramasi`),
    db.execute(sql`
      with ${baza}
      select extract(year from data at time zone 'Europe/Bucharest')::int as an, count(*)::int as donatii,
             count(distinct email)::int as donatori, coalesce(sum(suma), 0)::bigint as suma
      from don group by 1 order by 1 desc limit 4`),
    db.execute(sql`
      with ${baza}
      select coalesce(nullif(trim(sursa), ''), 'necompletat') as sursa, count(*)::int as nr
      from b group by 1 order by nr desc limit 4`),
  ]);

  const proiectePeGrup = new Map<string, { titlu: string; donatori: number }[]>();
  for (const r of proiecte as unknown as Rand[]) {
    const lista = proiectePeGrup.get(String(r.grup)) ?? [];
    if (lista.length < 5) lista.push({ titlu: String(r.titlu), donatori: num(r.donatori) });
    proiectePeGrup.set(String(r.grup), lista);
  }

  const grupStat: GrupStat[] = (grupuri as unknown as Rand[]).map((r) => ({
    grup: String(r.grup) as GrupCod,
    nr: num(r.nr),
    suma: num(r.suma),
    medianaTotal: num(r.mediana_total),
    medieDonatii: num(r.medie_donatii),
    medianaRecentaZile: num(r.mediana_recenta),
    medianaIntervalZile: r.mediana_interval == null ? null : num(r.mediana_interval),
    cuInterval: num(r.cu_interval),
    cuEmail: num(r.cu_email),
    dezabonati: num(r.dezabonati),
    riscLuni: num(r.risc_luni),
    inactivi: num(r.inactivi),
    proiecte: proiectePeGrup.get(String(r.grup)) ?? [],
  }));

  const gen = ((general as unknown as Rand[])[0] ?? {}) as Rand;
  const eligN = num(gen.elig_n);
  const retBaza = num(gen.ret_baza);
  const bazaStat: BazaStat = {
    donatori: num(gen.donatori),
    suma: num(gen.suma),
    medianaDonatie: num(gen.mediana_donatie),
    recurenti: num(gen.recurenti),
    // Procentele se afișează doar dacă baza de calcul are cel puțin 10 donatori.
    revenire: { valoare: eligN >= 10 ? Math.round((num(gen.elig_repetat) / eligN) * 100) : null, eligibili: eligN },
    retentie12: { valoare: retBaza >= 10 ? Math.round((num(gen.ret_ramasi) / retBaza) * 100) : null, baza: retBaza },
    surse: (surse as unknown as Rand[]).map((r) => ({ sursa: String(r.sursa), nr: num(r.nr) })),
    ani: (ani as unknown as Rand[]).map((r): AnStat => ({ an: num(r.an), donatii: num(r.donatii), donatori: num(r.donatori), suma: num(r.suma) })),
  };

  return { baza: bazaStat, grupuri: grupStat, canaleIntroduse };
}
