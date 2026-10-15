import { NextResponse } from "next/server";

import { cronAutorizat } from "@/lib/cron-auth";
import { organizatiiCuMeta, sincronizeazaMeta } from "@/lib/reclame/meta-sync";
import { raporteazaEroare } from "@/lib/monitoring";

// Rulat zilnic de Vercel Cron (vezi vercel.json): recitește ultimele 7 zile de costuri din Meta pentru fiecare organizație cu o conexiune activă
// (doar citire; corectează cifrele care se mai schimbă după câteva zile). Pe lângă el, pagina reîmprospătează singură datele mai vechi de o oră.
// Autentificat prin CRON_SECRET; fiecare organizație e izolată: o eroare la una nu oprește restul.
export const maxDuration = 300;
const DEADLINE_MS = 250_000;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  if (!cronAutorizat(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const deadline = Date.now() + DEADLINE_MS;
  const organizatii = await organizatiiCuMeta();
  let reusite = 0;
  let esuate = 0;
  for (const orgId of organizatii) {
    if (Date.now() > deadline) break;
    try {
      const r = await sincronizeazaMeta(orgId, { zile: 7, doarActiva: true, deadlineMs: Math.min(deadline, Date.now() + 90_000) });
      if (r.ok) reusite += 1;
      else esuate += 1;
    } catch (e) {
      esuate += 1;
      raporteazaEroare("cron-reclame-meta", e, { orgId });
    }
  }
  return NextResponse.json({ ok: true, organizatii: organizatii.length, reusite, esuate });
}
