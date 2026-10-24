import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { inOrgApi, proceseazaLivrari } from "@/lib/api-publica-server";
import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { raporteazaEroare } from "@/lib/monitoring";

// Rulat zilnic de Vercel Cron (vezi vercel.json): reia livrările de webhook rămase în așteptare (prima încercare se face imediat după eveniment; pauzele dintre reîncercări
// sunt de 1, 6, 24 și 72 de ore, deci o livrare nereușită se reia la rularea următoare) și șterge livrările mai vechi de 30 de zile.
export const maxDuration = 300;
const DEADLINE_MS = 240_000;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  if (!cronAutorizat(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const deadline = Date.now() + DEADLINE_MS;

  const orgIds = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return (await tx.execute(sql`select id from organizations`)) as unknown as { id: string }[];
  });

  let trimise = 0;
  let esuate = 0;
  let sterse = 0;
  for (const { id } of orgIds) {
    if (Date.now() > deadline) break;
    try {
      // Doar organizațiile care au livrări scadente: restul nu costă nimic în plus.
      const [{ n }] = await inOrgApi(id, async (tx) => (await tx.execute(sql`select count(*)::int as n from webhook_livrari where org_id = ${id} and stare = 'in_asteptare' and urmatoarea_incercare_la <= now()`)) as unknown as { n: number }[]);
      if (n > 0) {
        const r = await proceseazaLivrari(id, 50);
        trimise += r.trimise;
        esuate += r.esuate;
      }
      const s = await inOrgApi(id, async (tx) => (await tx.execute(sql`delete from webhook_livrari where org_id = ${id} and stare <> 'in_asteptare' and created_at < now() - interval '30 days' returning id`)) as unknown as unknown[]);
      sterse += s.length;
    } catch (e) {
      raporteazaEroare("cron-webhook-livrari", e, { orgId: id });
    }
  }
  return NextResponse.json({ ok: true, trimise, esuate, sterse });
}
