import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { pregatesteCitirea, ruleazaCitirea, salveazaCitirea } from "@/lib/agent-email/raspunsuri";
import { pregatesteReveniri, programeazaApeluri, ruleazaAiReveniri, salveazaReveniri } from "@/lib/agent-email/reveniri";
import { ZILE_VALABILITATE_CIORNA } from "@/lib/agent-email/reguli";
import { stergeCiorneExpirate } from "@/lib/agent-email/store";
import { rulezaCaOrganizatie } from "@/lib/ai-org/consum-server";
import { areModul } from "@/lib/billing/packages";
import { isAccessBlocked, pachetEfectiv } from "@/lib/billing/trial";
import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { raporteazaEroare } from "@/lib/monitoring";

// Rulat de Vercel Cron (zilele lucrătoare, de câteva ori pe zi; vezi vercel.json): pentru fiecare organizație cu modulul „ai-agenti”,
//  1) citește răspunsurile la emailurile trimise din căsuța fiecărui coleg (IMAP, doar citire), le leagă de fir (Message-ID), ignoră răspunsurile automate și le etichetează cu AI
//     (consumul intră în Consum AI al organizației); STOP / refuz => persoana nu mai primește emailuri;
//  2) dimineața (ora României), scrie CIORNE de revenire pentru emailurile fără răspuns de 5 zile lucrătoare: ciornele așteaptă aprobarea unui om, nu pleacă singure;
//  3) programează sarcina „Sună” după o revenire rămasă fără răspuns; 4) șterge ciornele netrimise mai vechi de 14 zile.
// Autentificat prin CRON_SECRET, ca restul cron-urilor. Nu trimite niciun email.
export const maxDuration = 300;
export const dynamic = "force-dynamic";
const DEADLINE_MS = 240_000;
const LIMITA_REVENIRI_PE_ORGANIZATIE = 5;

const tr = (ro: string) => ro;
const oraBucuresti = (): number => Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Bucharest" }).format(new Date())) % 24;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  if (!cronAutorizat(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const deadline = Date.now() + DEADLINE_MS;

  const orgs = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx
      .select({ id: organizations.id, slug: organizations.slug, name: organizations.name, createdAt: organizations.createdAt, subscriptionStatus: organizations.subscriptionStatus, package: organizations.package, currentPeriodEnd: organizations.currentPeriodEnd })
      .from(organizations);
  });

  const rezultate: { orgSlug: string; casute: number; raspunsuri: number; reveniri: number; apeluri: number; sterse: number }[] = [];
  const dimineata = oraBucuresti() >= 7 && oraBucuresti() <= 10;
  for (const org of orgs) {
    if (Date.now() > deadline) break;
    // Acces blocat (probă expirată, neplătit) sau pachet fără modul: nu atingem căsuțele colegilor.
    if (isAccessBlocked(org) || !areModul(pachetEfectiv(org), "ai-agenti")) continue;
    try {
      const rest = Math.max(20_000, Math.min(100_000, deadline - Date.now() - 60_000));
      const pregatit = await rulezaCaOrganizatie(org.id, (tx) => pregatesteCitirea(tx, { orgId: org.id, orgNume: org.name, locale: "ro", durataMs: rest }));
      let raspunsuri = 0;
      if (pregatit.conturi.length) {
        const citit = await ruleazaCitirea(pregatit);
        raspunsuri = (await rulezaCaOrganizatie(org.id, (tx) => salveazaCitirea(tx, pregatit, citit))).noi;
      }
      const apeluri = await rulezaCaOrganizatie(org.id, (tx) => programeazaApeluri(tx, org.id));

      let reveniri = 0;
      if (dimineata && Date.now() < deadline - 60_000) {
        // Limita e pe ZI (nu pe rulare): iarna dimineața are două rulări, iar fără numărătoare din baza de date s-ar ajunge la dublu.
        const deja = await rulezaCaOrganizatie(org.id, async (tx) => {
          const [r] = (await tx.execute(sql`select count(*)::int as n from agent_email_mesaje where org_id = ${org.id} and tip = 'revenire' and created_at >= (date_trunc('day', now() at time zone 'Europe/Bucharest') at time zone 'Europe/Bucharest')`)) as unknown as { n: number }[];
          return r?.n ?? 0;
        });
        const limitaRamasa = Math.max(0, LIMITA_REVENIRI_PE_ORGANIZATIE - deja);
        const rv = limitaRamasa > 0 ? await rulezaCaOrganizatie(org.id, (tx) => pregatesteReveniri(tx, tr, { orgId: org.id, orgNume: org.name, locale: "ro", userId: null, userNume: "Agent email (automat)", doarDe: null, limita: limitaRamasa })) : { gata: null };
        if ("pregatit" in rv) {
          const rez = await ruleazaAiReveniri(rv.pregatit);
          reveniri = (await rulezaCaOrganizatie(org.id, (tx) => salveazaReveniri(tx, rv.pregatit, rez))).create;
        }
      }
      const sterse = await rulezaCaOrganizatie(org.id, (tx) => stergeCiorneExpirate(tx, org.id, ZILE_VALABILITATE_CIORNA));
      if (pregatit.conturi.length || raspunsuri || reveniri || apeluri || sterse) rezultate.push({ orgSlug: org.slug, casute: pregatit.conturi.length, raspunsuri, reveniri, apeluri, sterse });
    } catch (e) {
      raporteazaEroare("cron-agent-email", e, { orgSlug: org.slug });
    }
  }
  return NextResponse.json({ ok: true, organizatii: rezultate.length, rezultate });
}
