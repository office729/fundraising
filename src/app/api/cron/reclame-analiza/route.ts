import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { ziBucuresti } from "@/lib/ai-org/consum";
import { areModul } from "@/lib/billing/packages";
import { isAccessBlocked, pachetEfectiv } from "@/lib/billing/trial";
import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { raporteazaEroare } from "@/lib/monitoring";
import { ruleazaAnalizaPentruOrganizatie } from "@/lib/reclame/analiza-ai-server";

// Rulat luni dimineața (vercel.json): analiza AI a reclamelor din ultimele 7 zile încheiate, pentru fiecare organizație care are contul Anthropic conectat
// și date de reclame. Fiecare organizație rulează în propria tranzacție (RLS), una după alta; o eroare la una nu le oprește pe celelalte. Idempotent pe
// săptămână (o a doua rulare în aceeași săptămână nu plătește încă o dată). Fără cont Anthropic sau fără date, organizația e sărită fără eroare.
// Autentificat prin CRON_SECRET.
export const maxDuration = 300;
const DEADLINE_MS = 270_000;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  if (!cronAutorizat(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const deadline = Date.now() + DEADLINE_MS;
  const azi = ziBucuresti(new Date());
  // Lista organizațiilor (doar id-urile) în contextul de încredere app.public_lookup; tot restul se face apoi pe fiecare organizație.
  const organizatii = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx
      .select({ id: organizations.id, package: organizations.package, createdAt: organizations.createdAt, subscriptionStatus: organizations.subscriptionStatus, currentPeriodEnd: organizations.currentPeriodEnd })
      .from(organizations);
  });

  let analizate = 0;
  let sarite = 0;
  let esuate = 0;
  for (const org of organizatii) {
    // Doar organizațiile al căror pachet include agenții AI și al căror acces nu e blocat (proba terminată, fără abonament).
    const pachet = pachetEfectiv(org);
    if (!areModul(pachet, "ai-agenti") || isAccessBlocked({ createdAt: org.createdAt, subscriptionStatus: org.subscriptionStatus, package: pachet, currentPeriodEnd: org.currentPeriodEnd })) {
      sarite += 1;
      continue;
    }
    // Un apel AI durează până la ~100 s: nu pornim unul nou dacă nu mai e timp să se termine.
    if (Date.now() > deadline - 110_000) break;
    try {
      const r = await ruleazaAnalizaPentruOrganizatie(org.id, azi);
      if (r.ok) analizate += 1;
      else if (r.cod === "ai" || r.cod === "format") esuate += 1;
      else sarite += 1;
    } catch (e) {
      esuate += 1;
      raporteazaEroare("cron-reclame-analiza", e, { orgId: org.id });
    }
  }
  return NextResponse.json({ ok: true, organizatii: organizatii.length, analizate, sarite, esuate });
}
