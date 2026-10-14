import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { isAccessBlocked } from "@/lib/billing/trial";
import { trimiteRezumatCalendar } from "@/lib/calendar-rezumat";
import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { emailConfigurat } from "@/lib/email";
import { raporteazaAvertisment, raporteazaEroare } from "@/lib/monitoring";

// Rulat în fiecare luni de Vercel Cron (vezi vercel.json): rezumatul săptămânii din calendarul de fundraising, către proprietarii
// organizațiilor al căror pachet include calendarul. Nu pleacă nimic când nu e nimic de spus. Autentificat prin CRON_SECRET.
export const maxDuration = 300;
const DEADLINE_MS = 240_000;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  if (!cronAutorizat(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!emailConfigurat()) {
    raporteazaAvertisment("cron-calendar", "email neconfigurat — rezumatul săptămânal al calendarului nu pleacă");
    return NextResponse.json({ ok: true, trimise: 0, motiv: "email_neconfigurat" });
  }

  const deadline = Date.now() + DEADLINE_MS;
  const orgs = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx
      .select({
        id: organizations.id,
        slug: organizations.slug,
        name: organizations.name,
        createdAt: organizations.createdAt,
        subscriptionStatus: organizations.subscriptionStatus,
        package: organizations.package,
        currentPeriodEnd: organizations.currentPeriodEnd,
      })
      .from(organizations);
  });

  let trimise = 0;
  for (const org of orgs) {
    if (Date.now() > deadline) break;
    if (isAccessBlocked(org)) continue; // fără acces plătit, platforma nu mai trimite e-mailuri în numele organizației
    try {
      const r = await trimiteRezumatCalendar({ id: org.id, slug: org.slug, nume: org.name, pachet: org.package });
      if (r.trimis) trimise += 1;
    } catch (e) {
      raporteazaEroare("cron-calendar", e, { orgSlug: org.slug });
    }
  }
  return NextResponse.json({ ok: true, trimise });
}
