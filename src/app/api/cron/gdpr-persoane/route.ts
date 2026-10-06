import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { raporteazaEroare } from "@/lib/monitoring";

// Rulat zilnic (vercel.json) — retenție GDPR pentru persoanele găsite dar încă neaprobate: cele din lista „De aprobat” a unei
// firme (companies.extra.deAprobat) mai vechi de 60 de zile se șterg efectiv. Intrările fără dată (create înainte de această
// regulă) primesc acum data zilei, ca să expire și ele peste 60 de zile.
// NOTĂ: în acest proiect nu există un cache de „rezultate de căutare memorate” — nu are ce să se șteargă din el.
const ZILE_NEAPROBATE = 60;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  if (!cronAutorizat(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orgs = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx.select({ id: organizations.id }).from(organizations);
  });

  let firmeCurate = 0;
  for (const org of orgs) {
    try {
      const rez = await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.current_org_id', ${org.id}, true)`);
        // CASE: `jsonb_array_length` pe o valoare care nu e array ar da eroare, iar ordinea condițiilor AND nu e garantată.
        return tx.execute(sql`
          update companies c set extra = jsonb_set(coalesce(c.extra, '{}'::jsonb), '{deAprobat}', coalesce((
            select jsonb_agg(e || jsonb_build_object('adaugatLa', coalesce(e->>'adaugatLa', now()::text)))
            from jsonb_array_elements(c.extra->'deAprobat') e
            where coalesce((e->>'adaugatLa')::timestamptz, now()) > now() - make_interval(days => ${ZILE_NEAPROBATE})
          ), '[]'::jsonb))
          where c.org_id = ${org.id}
            and case when jsonb_typeof(c.extra->'deAprobat') = 'array' then jsonb_array_length(c.extra->'deAprobat') > 0 else false end
          returning c.id`);
      });
      firmeCurate += rez.length;
    } catch (e) {
      raporteazaEroare("gdpr-persoane-retentie", e, { orgId: org.id });
    }
  }
  return NextResponse.json({ ok: true, firmeVerificate: firmeCurate });
}
