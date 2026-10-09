import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { raporteazaEroare } from "@/lib/monitoring";
import { ruleazaAutomatizari } from "@/lib/performanta-automatizari";

// Rulat în zilele lucrătoare (vercel.json): automatizările modulului Echipă & Performanță — notificări de termene, blocaje, actualizări,
// rezumat săptămânal, obiective în risc, plus sarcini create din donații confirmate și sponsorizări noi. Regulile pornite per organizație
// sunt în setările ei; ce nu e pornit nu rulează. Fiecare organizație rulează în propria tranzacție, deci o eroare nu le oprește pe celelalte.
export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  if (!cronAutorizat(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orgs = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx.select({ id: organizations.id, slug: organizations.slug }).from(organizations);
  });

  let rulate = 0;
  let notificari = 0;
  for (const org of orgs) {
    try {
      const r = await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.current_org_id', ${org.id}, true)`);
        return ruleazaAutomatizari(tx as unknown as typeof db, org.id, org.slug);
      });
      if (r.ruleaza) {
        rulate++;
        notificari += r.rezultat.termene + r.rezultat.blocaje + r.rezultat.actualizari + r.rezultat.rezumat + r.rezultat.risc;
      }
    } catch (e) {
      raporteazaEroare("performanta-automatizari", e, { orgId: org.id });
    }
  }
  return NextResponse.json({ ok: true, organizatii: orgs.length, rulate, notificari });
}
