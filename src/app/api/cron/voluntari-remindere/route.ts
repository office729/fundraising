import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { isAccessBlocked } from "@/lib/billing/trial";
import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { organizations, volunteerPanelLinks } from "@/lib/db/schema";
import { emailConfigurat } from "@/lib/email";
import { raporteazaAvertisment, raporteazaEroare } from "@/lib/monitoring";
import { trimiteRemindereVoluntari } from "@/lib/voluntari-remindere";

// Rulat zilnic de Vercel Cron (vezi vercel.json): reminder pentru voluntarii confirmați la activități care încep în următoarele
// 36 de ore și mulțumire după validarea orelor. Fiecare mesaj pleacă o singură dată. Autentificat prin CRON_SECRET.
export const maxDuration = 300;
const DEADLINE_MS = 240_000;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  if (!cronAutorizat(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!emailConfigurat()) {
    raporteazaAvertisment("cron-voluntari", "email neconfigurat — remindere și mulțumiri pentru voluntari nu pleacă");
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
        cod: volunteerPanelLinks.cod,
      })
      .from(organizations)
      .leftJoin(volunteerPanelLinks, eq(volunteerPanelLinks.orgId, organizations.id));
  });

  const rezultate: { orgSlug: string; remindere: number; multumiri: number; esuate: number }[] = [];
  for (const org of orgs) {
    if (Date.now() > deadline) break;
    if (isAccessBlocked(org)) continue; // fără acces plătit, platforma nu mai trimite emailuri în numele organizației
    try {
      const r = await trimiteRemindereVoluntari({ id: org.id, nume: org.name }, org.cod, deadline);
      if (r.remindere + r.multumiri + r.esuate > 0) rezultate.push({ orgSlug: org.slug, ...r });
    } catch (e) {
      raporteazaEroare("cron-voluntari", e, { orgSlug: org.slug });
    }
  }
  return NextResponse.json({ ok: true, organizatii: rezultate.length, rezultate });
}
