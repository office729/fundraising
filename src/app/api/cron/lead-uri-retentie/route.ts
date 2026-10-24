import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { raporteazaEroare } from "@/lib/monitoring";

// Rulat lunar de Vercel Cron (vezi vercel.json): șterge lead-urile din formularul „Descoperă Alexandrit” care n-au mai avut nicio mișcare de peste 24 de luni
// (ultima completare sau ultima modificare de către echipă), cum promite Politica de confidențialitate. Cele marcate „Înscris” rămân: au devenit clienți, iar datele
// lor urmează regulile contului. Copiile primite pe e-mail de echipă nu se șterg de aici: se curăță din căsuța de e-mail.
export const maxDuration = 60;

const RETENTIE_LUNI = 24;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  if (!cronAutorizat(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const sterse = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.platform_admin', 'true', true)`);
      return (await tx.execute(sql`
        delete from interese_ong
        where stare <> 'inscris' and greatest(ultima_trimitere_la, coalesce(actualizat_la, creat_la)) < now() - ${RETENTIE_LUNI} * interval '1 month'
        returning id`)) as unknown as unknown[];
    });
    return NextResponse.json({ ok: true, sterse: sterse.length });
  } catch (e) {
    raporteazaEroare("cron-lead-uri-retentie", e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
