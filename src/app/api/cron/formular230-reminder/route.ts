import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { isAccessBlocked } from "@/lib/billing/trial";
import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { emailConfigurat } from "@/lib/email";
import { trimiteCampanieF230 } from "@/lib/formular230-campanie";
import { raporteazaAvertisment, raporteazaEroare } from "@/lib/monitoring";

// Rulat zilnic de Vercel Cron (vezi vercel.json) — trimite O SINGURĂ dată pe
// an, per organizație, reamintirea de Formular 230 către donatorii reali,
// în fereastra de ZILE_INAINTE_TERMEN zile înainte de termenul ANAF (25 mai).
// Autentificat prin CRON_SECRET (header pus automat de Vercel Cron când
// variabila e setată în proiect) — fără el, orice cerere publică ar putea
// declanșa trimiteri, deci ruta refuză să ruleze.
//
// Logica de trimitere (revendicare, jurnal per destinatar, reluare după
// întrerupere) e în lib/formular230-campanie.ts, comună cu butonul manual.
// Rulează în contextul de încredere app.public_lookup, fără sesiune de user.

// Durata maximă a funcției; trimiterea se oprește singură la DEADLINE_MS și
// continuă la rularea următoare (campania e rezumabilă).
export const maxDuration = 300;
const DEADLINE_MS = 240_000;

const ZILE_INAINTE_TERMEN = 10;
const TERMEN_LUNA = 5; // mai
const TERMEN_ZI = 25;

function inFereastraTermen(acum: Date): boolean {
  const an = acum.getUTCFullYear();
  const termen = new Date(Date.UTC(an, TERMEN_LUNA - 1, TERMEN_ZI));
  const start = new Date(termen);
  start.setUTCDate(start.getUTCDate() - ZILE_INAINTE_TERMEN);
  return acum >= start && acum <= termen;
}

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  }
  if (!cronAutorizat(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const acum = new Date();
  if (!inFereastraTermen(acum)) {
    return NextResponse.json({ ok: true, trimise: 0, motiv: "in_afara_ferestrei" });
  }
  if (!emailConfigurat()) {
    // În fereastra de 10 zile, lipsa SMTP trece altfel neobservată — alertă.
    raporteazaAvertisment("cron-formular230", "email neconfigurat în fereastra campaniei F230 — nu se trimite nimic");
    return NextResponse.json({ ok: true, trimise: 0, motiv: "email_neconfigurat" });
  }

  const an = acum.getUTCFullYear();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fundraising-academy-one.vercel.app";
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

  const rezultate: { orgSlug: string; stare: string; trimise: number; ramase: number }[] = [];

  for (const org of orgs) {
    if (Date.now() > deadline) break; // restul continuă la rularea următoare
    // Organizațiile cu acces blocat (probă expirată, neplătite) nu mai trimit
    // emailuri donatorilor lor în numele platformei.
    if (isAccessBlocked(org)) continue;
    try {
      const r = await trimiteCampanieF230({ org, an, baseUrl, trimisDe: null, deadline });
      if (r.stare === "deja_trimisa" || r.stare === "fara_link" || r.stare === "fara_destinatari") continue;
      rezultate.push({ orgSlug: org.slug, stare: r.stare, trimise: r.trimise, ramase: r.ramase });
    } catch (e) {
      raporteazaEroare("cron-formular230", e, { orgSlug: org.slug });
    }
  }

  return NextResponse.json({ ok: true, organizatii: rezultate.length, rezultate });
}
