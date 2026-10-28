import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { verificaLimitaRata } from "@/lib/auth/rate-limit";
import { areModul } from "@/lib/billing/packages";
import { isAccessBlocked, pachetEfectiv } from "@/lib/billing/trial";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { citesteEvenimente } from "@/lib/waalaxy-evenimente";
import { citesteVersiuneWebhook, proceseazaEvenimente, verificaToken } from "@/lib/waalaxy-server";

// Webhook-ul Waalaxy („CRM Sync → Webhook”): acceptările de invitație și răspunsurile vin DOAR aici, API-ul Waalaxy nu le expune. Adresa e secretă, a organizației
// (?t=<token>, vezi lib/waalaxy-server.ts) și se poate regenera din Setări → Prospectare; cea veche încetează să funcționeze.
// Doar pentru organizațiile cu prospectare (pachetul IMPACT) și acces activ. Evenimentele se potrivesc cu firme și persoane din CRM; restul se numără și se aruncă.
export const maxDuration = 60;
const MAX_CORP = 200_000;

async function organizatieDinToken(req: Request): Promise<{ ok: true; orgId: string } | { ok: false; status: number; motiv: string }> {
  const v = verificaToken(new URL(req.url).searchParams.get("t"));
  if (!v) return { ok: false, status: 401, motiv: "unauthorized" };
  const stare = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const [org] = await tx
      .select({ id: organizations.id, createdAt: organizations.createdAt, subscriptionStatus: organizations.subscriptionStatus, package: organizations.package, currentPeriodEnd: organizations.currentPeriodEnd })
      .from(organizations)
      .where(sql`${organizations.id} = ${v.orgId}`)
      .limit(1);
    if (!org) return null;
    await tx.execute(sql`select set_config('app.current_org_id', ${v.orgId}, true)`);
    return { org, versiune: await citesteVersiuneWebhook(tx, v.orgId) };
  });
  // Adresa regenerată (versiune nouă) o înlocuiește pe cea veche; o organizație inexistentă arată ca o adresă greșită.
  if (!stare || stare.versiune !== v.versiune) return { ok: false, status: 401, motiv: "unauthorized" };
  if (isAccessBlocked(stare.org) || !areModul(pachetEfectiv(stare.org), "prospectare-multi")) return { ok: false, status: 403, motiv: "fara_acces" };
  return { ok: true, orgId: v.orgId };
}

// Verificarea adresei (Waalaxy și instrumentele de automatizare o apelează ca să vadă că e validă).
export async function GET(req: Request) {
  const r = await organizatieDinToken(req);
  return r.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: r.motiv }, { status: r.status });
}

export async function POST(req: Request) {
  const r = await organizatieDinToken(req);
  if (!r.ok) return NextResponse.json({ error: r.motiv }, { status: r.status });
  if (!(await verificaLimitaRata("waalaxy-webhook", r.orgId, 600, 60))) return NextResponse.json({ error: "prea_multe_cereri" }, { status: 429 });

  const lungime = Number(req.headers.get("content-length") ?? 0);
  if (lungime > MAX_CORP) return NextResponse.json({ error: "prea_mare" }, { status: 413 });
  const text = await req.text();
  if (text.length > MAX_CORP) return NextResponse.json({ error: "prea_mare" }, { status: 413 });

  // JSON; dacă nu e, formular (application/x-www-form-urlencoded).
  let corp: unknown;
  try {
    corp = JSON.parse(text);
  } catch {
    const params = new URLSearchParams(text);
    corp = params.size > 0 ? Object.fromEntries(params.entries()) : null;
  }
  if (corp == null) return NextResponse.json({ error: "corp_invalid" }, { status: 400 });

  const rezultat = await proceseazaEvenimente(db, r.orgId, citesteEvenimente(corp));
  return NextResponse.json({ ok: true, ...rezultat });
}
