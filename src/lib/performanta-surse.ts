import { sql } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { bazaDonatori, donCte } from "@/lib/donatori-pf";
export { METRICA_PE_ID, METRICI_CRM, type MetricaCrm } from "@/lib/performanta-metrici";

// Sursele „CRM” ale rezultatelor-cheie: valori calculate din datele deja existente în platformă, ca să nu se reintroducă manual.
// Toate sunt rezultate ale ORGANIZAȚIEI. Nu se atribuie automat unei persoane (regula de atribuire e afișată lângă rezultat).

type Db = OrgContext["db"];
const rand = (r: unknown) => (r as Record<string, unknown>[])[0] ?? {};
const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

// Limitele perioadei sunt zile calendaristice din România.
const lim = (start: string, end: string) => ({
  de: sql`((${start}::date)::timestamp at time zone 'Europe/Bucharest')`,
  pana: sql`(((${end}::date + 1))::timestamp at time zone 'Europe/Bucharest')`,
});

export async function valoareCrm(db: Db, orgId: string, metrica: string, start: string, end: string): Promise<number | null> {
  const { de, pana } = lim(start, end);
  switch (metrica) {
    case "incasari_totale": {
      const r = rand(await db.execute(sql`with ${donCte(orgId)} select coalesce(sum(suma), 0)::bigint as v from don where data >= ${de} and data < ${pana}`));
      return n(r.v);
    }
    case "incasari_recurente": {
      const r = rand(await db.execute(sql`with ${donCte(orgId)} select coalesce(sum(suma), 0)::bigint as v from don where recurenta and data >= ${de} and data < ${pana}`));
      return n(r.v);
    }
    case "donatii_nr": {
      const r = rand(await db.execute(sql`with ${donCte(orgId)} select count(*)::int as v from don where data >= ${de} and data < ${pana}`));
      return n(r.v);
    }
    case "donatori_noi": {
      const r = rand(await db.execute(sql`with ${donCte(orgId)}, p as (select email, min(data) as prima from don group by email) select count(*)::int as v from p where prima >= ${de} and prima < ${pana}`));
      return n(r.v);
    }
    case "retentie_donatori": {
      const r = rand(
        await db.execute(sql`
          with ${donCte(orgId)},
          bazaa as (select distinct email from don where data >= ${de} - interval '12 months' and data < ${de}),
          inperioada as (select distinct email from don where data >= ${de} and data < ${pana})
          select (select count(*) from bazaa)::int as numitor, (select count(*) from bazaa b join inperioada p on p.email = b.email)::int as numarator`),
      );
      const numitor = n(r.numitor) ?? 0;
      return numitor > 0 ? Math.round(((n(r.numarator) ?? 0) / numitor) * 1000) / 10 : null; // numitor zero => lipsă date, nu 0%
    }
    case "donatori_lunari_activi": {
      const r = rand(await db.execute(sql`with ${bazaDonatori(orgId)} select count(*) filter (where lunar)::int as v from base`));
      return n(r.v);
    }
    case "sponsorizari_inregistrate": {
      const r = rand(await db.execute(sql`select coalesce(sum(suma), 0)::bigint as v from company_sponsorizari where org_id = ${orgId} and data >= ${start}::date and data <= ${end}::date`));
      return n(r.v);
    }
    case "sponsorizari_nr": {
      const r = rand(await db.execute(sql`select count(*)::int as v from company_sponsorizari where org_id = ${orgId} and data >= ${start}::date and data <= ${end}::date`));
      return n(r.v);
    }
    case "completitudine_date_donatori": {
      const r = rand(
        await db.execute(sql`select count(*)::int as total, count(*) filter (where coalesce(telefon, '') <> '' and coalesce(localitate, '') <> '' and coalesce(judet, '') <> '')::int as complet from donatori_reali where org_id = ${orgId}`),
      );
      const total = n(r.total) ?? 0;
      return total > 0 ? Math.round(((n(r.complet) ?? 0) / total) * 1000) / 10 : null;
    }
    default:
      return null;
  }
}
