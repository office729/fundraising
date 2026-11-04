import { sql, type SQL } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";

// Indicatorul „Influenceri identificați” pentru rezultatele-cheie din Echipă & Performanță: câte fișe de influencer au fost create (adăugate sau importate) în perioadă.
// Se numără automat din fișele care există acum, deci cele șterse la cerere nu mai intră. Ținta o stabilește doar cine vrea, în rezultatul-cheie; nu există țintă implicită.
// Tabelul îl creează modulul Influenceri (documentation/influenceri.sql): aici doar verificăm că există (to_regclass), fără DDL; fără el, valoarea lipsește (nu 0).

type Db = OrgContext["db"];

export async function valoareInfluenceriIdentificati(db: Db, orgId: string, de: SQL, pana: SQL): Promise<number | null> {
  const [t] = (await db.execute(sql`select to_regclass('public.influenceri')::text as t`)) as unknown as { t: string | null }[];
  if (!t?.t) return null;
  const [r] = (await db.execute(sql`select count(*)::int as v from influenceri where org_id = ${orgId} and created_at >= ${de} and created_at < ${pana}`)) as unknown as { v: number }[];
  return r ? Number(r.v) : null;
}
