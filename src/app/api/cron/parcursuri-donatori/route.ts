import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { isAccessBlocked } from "@/lib/billing/trial";
import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { emailConfigurat } from "@/lib/email";
import { raporteazaAvertisment, raporteazaEroare } from "@/lib/monitoring";
import { areModul } from "@/lib/billing/packages";
import { inIntervalDeTrimitere } from "@/lib/parcursuri-donatori";
import { MAX_TRIMISE_PE_RULARE, ruleazaParcursuriOrg } from "@/lib/parcursuri-server";

// Rulat zilnic de Vercel Cron (vezi vercel.json): trimite pașii scadenți ai parcursurilor Welcome, Save și Upgrade, pentru organizațiile care le-au pornit.
// Autentificat prin CRON_SECRET, ca restul cron-urilor. Logica (selecție, revendicare înainte de trimitere, plafoane) e în lib/parcursuri-server.ts.
export const maxDuration = 300;
const DEADLINE_MS = 240_000;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  if (!cronAutorizat(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // Ore de liniște: mesaje doar între 9:00 și 19:00, ora României (cron-ul rulează la 08:00 UTC, deci în interval; paza oprește o rulare întârziată sau manuală de noapte).
  if (!inIntervalDeTrimitere(new Date())) return NextResponse.json({ ok: true, trimise: 0, motiv: "in_afara_orelor" });
  if (!emailConfigurat()) {
    raporteazaAvertisment("cron-parcursuri", "email neconfigurat — parcursurile donatorilor nu pleacă");
    return NextResponse.json({ ok: true, trimise: 0, motiv: "email_neconfigurat" });
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://alexandrit.ro";
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

  const rezultate: { orgSlug: string; trimise: number; esuate: number; intrerupt: boolean }[] = [];
  for (const org of orgs) {
    if (Date.now() > deadline) break;
    // Acces blocat (probă expirată, neplătit) sau pachet fără modul: nu mai trimitem donatorilor în numele platformei.
    if (isAccessBlocked(org) || !areModul(org.package, "parcursuri-donatori")) continue;
    try {
      const r = await ruleazaParcursuriOrg({ org: { id: org.id, slug: org.slug, name: org.name }, baseUrl, deadline, plafon: MAX_TRIMISE_PE_RULARE });
      if (r.trimise || r.esuate) rezultate.push({ orgSlug: org.slug, trimise: r.trimise, esuate: r.esuate, intrerupt: r.intrerupt });
    } catch (e) {
      raporteazaEroare("cron-parcursuri", e, { orgSlug: org.slug });
    }
  }
  return NextResponse.json({ ok: true, organizatii: rezultate.length, rezultate });
}
