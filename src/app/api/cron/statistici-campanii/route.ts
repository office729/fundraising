import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { raporteazaEroare } from "@/lib/monitoring";

// Rulat zilnic (vercel.json) — retenția statisticilor de trafic ale campaniilor: evenimentele (vizită, deschiderea formularului) se
// păstrează 13 luni (cât acoperă perioada „12 luni" din pagina de statistici), apoi se șterg. Fiecare organizație se curăță separat,
// în contextul ei, ca politica de izolare pe organizație să rămână valabilă.
const LUNI_RETENTIE = 13;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  if (!cronAutorizat(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orgs = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx.select({ id: organizations.id }).from(organizations);
  });

  let sterse = 0;
  for (const org of orgs) {
    try {
      const rez = await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.current_org_id', ${org.id}, true)`);
        return tx.execute(sql`delete from campaign_page_events where org_id = ${org.id} and ziua < (timezone('Europe/Bucharest', now()))::date - make_interval(months => ${LUNI_RETENTIE}) returning id`);
      });
      sterse += rez.length;
    } catch (e) {
      raporteazaEroare("statistici-campanii-retentie", e, { orgId: org.id });
    }
  }
  return NextResponse.json({ ok: true, evenimenteSterse: sterse });
}
