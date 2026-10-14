import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { isAccessBlocked, pachetEfectiv } from "@/lib/billing/trial";
import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { emailConfigurat } from "@/lib/email";
import { trimiteRemindereGranturi } from "@/lib/granturi/remindere";
import { raporteazaAvertisment, raporteazaEroare } from "@/lib/monitoring";

// Rulat zilnic de Vercel Cron (vezi vercel.json): reminder de termen (7 zile și o zi înainte) pentru cererile de finanțare nedepuse.
// Fiecare reminder pleacă o singură dată. Autentificat prin CRON_SECRET.
export const maxDuration = 300;
const DEADLINE_MS = 240_000;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  if (!cronAutorizat(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!emailConfigurat()) {
    raporteazaAvertisment("cron-granturi", "email neconfigurat — remindere de termen pentru granturi nu pleacă");
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

  const rezultate: { orgSlug: string; trimise: number; esuate: number }[] = [];
  for (const org of orgs) {
    if (Date.now() > deadline) break;
    if (isAccessBlocked(org)) continue; // fără acces plătit, platforma nu mai trimite e-mailuri în numele organizației
    try {
      const r = await trimiteRemindereGranturi({ id: org.id, slug: org.slug, nume: org.name, pachet: pachetEfectiv(org) }, deadline);
      if (r.trimise + r.esuate > 0) rezultate.push({ orgSlug: org.slug, ...r });
    } catch (e) {
      raporteazaEroare("cron-granturi", e, { orgSlug: org.slug });
    }
  }
  return NextResponse.json({ ok: true, organizatii: rezultate.length, rezultate });
}
