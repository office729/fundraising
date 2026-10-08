import { sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";

// Segmentele REALE ale donatorilor persoane fizice (RFM simplificat), calculate din donatori_reali + abonamentele active.
// Aceleași denumiri ca în pagina „Segmente de donatori”. Reguli, în ordinea evaluării (primul care se potrivește câștigă):
//  - recurent: are un abonament lunar activ;
//  - inactiv:  ultima donație a fost acum mai mult de 12 luni;
//  - major:    suma totală donată e în top 10% (doar cu cel puțin 10 donatori în bază, ca pragul să aibă sens);
//  - in_risc:  ultima donație a fost acum 6–12 luni;
//  - nou:      o singură donație, în ultimele 6 luni;
//  - fidel:    cel puțin două donații, ultima în ultimele 6 luni.
// „Reactivat” nu se calculează: ar cere istoricul fiecărei donații, iar donațiile introduse manual nu îl au.
export type SegmentReal = "nou" | "fidel" | "major" | "recurent" | "in_risc" | "inactiv" | "reactivat";

export type SegmentStat = { segment: SegmentReal; nr: number; suma: number };

export const SEGMENTE_REALE: SegmentReal[] = ["nou", "fidel", "major", "recurent", "in_risc", "inactiv", "reactivat"];

export async function obtineSegmenteReale(db: OrgContext["db"], orgId: string): Promise<SegmentStat[]> {
  const rows = (await db.execute(sql`
    with s as (
      select d.total_donat, d.numar_donatii, d.ultima_donatie_la,
        exists (
          select 1 from fundraising_donations f
          where f.org_id = d.org_id and lower(f.email_donator) = lower(d.email) and f.recurenta and f.abonament_activ
        ) as rec
      from donatori_reali d
      where d.org_id = ${orgId}
    ),
    p as (
      select coalesce(percentile_cont(0.9) within group (order by total_donat), 0) as p90, count(*) as n from s
    )
    select seg, count(*)::int as nr, coalesce(sum(total_donat), 0)::bigint as suma
    from (
      select s.total_donat,
        case
          when s.rec then 'recurent'
          when s.ultima_donatie_la < now() - interval '12 months' then 'inactiv'
          when p.n >= 10 and s.total_donat > 0 and s.total_donat >= p.p90 then 'major'
          when s.ultima_donatie_la < now() - interval '6 months' then 'in_risc'
          when s.numar_donatii <= 1 then 'nou'
          else 'fidel'
        end as seg
      from s cross join p
    ) x
    group by seg
  `)) as unknown as Array<{ seg: SegmentReal; nr: number; suma: number }>;
  const dupa = new Map(rows.map((r) => [r.seg, r]));
  return SEGMENTE_REALE.map((segment) => ({ segment, nr: dupa.get(segment)?.nr ?? 0, suma: Number(dupa.get(segment)?.suma ?? 0) }));
}
