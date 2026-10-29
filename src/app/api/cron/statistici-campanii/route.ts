import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { raporteazaEroare } from "@/lib/monitoring";

// Rulat zilnic (vercel.json) — retenția statisticilor de trafic ale campaniilor: evenimentele (vizită, deschiderea formularului) se
// păstrează 13 luni (cât acoperă perioada „12 luni" din pagina de statistici), apoi se șterg. Fiecare organizație se curăță separat,
// în contextul ei, ca politica de izolare pe organizație să rămână valabilă.
const LUNI_RETENTIE = 13;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  if (!cronAutorizat(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orgs = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx.select({ id: organizations.id }).from(organizations);
  });

  let sterse = 0;
  let atribSterse = 0;
  for (const org of orgs) {
    try {
      // Provenința vizitatorilor (atribuire): evenimentele se păstrează tot 13 luni; după aceea conversiile își pierd identificatorul pseudonim (instantaneul de sursă rămâne),
      // iar instantaneele conversiilor șterse între timp (donație, formular) se elimină.
      try {
        atribSterse += await db.transaction(async (tx) => {
          await tx.execute(sql`select set_config('app.current_org_id', ${org.id}, true)`);
          const ev = await tx.execute(sql`delete from atrib_evenimente where org_id = ${org.id} and ziua < (timezone('Europe/Bucharest', now()))::date - make_interval(months => ${LUNI_RETENTIE}) returning id`);
          await tx.execute(sql`update atrib_conversii set vizitator_id = null, sesiune_id = null where org_id = ${org.id} and vizitator_id is not null and conversie_la < now() - make_interval(months => ${LUNI_RETENTIE})`);
          await tx.execute(sql`delete from atrib_conversii c where c.org_id = ${org.id} and ((c.tip = 'donatie' and not exists (select 1 from fundraising_donations d where d.id = c.entitate_id)) or (c.tip = 'f230' and not exists (select 1 from formular230_submissions s where s.id = c.entitate_id)))`);
          return ev.length;
        });
      } catch (e) {
        raporteazaEroare("atribuire-retentie", e, { orgId: org.id });
      }
      const rez = await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.current_org_id', ${org.id}, true)`);
        return tx.execute(sql`delete from campaign_page_events where org_id = ${org.id} and ziua < (timezone('Europe/Bucharest', now()))::date - make_interval(months => ${LUNI_RETENTIE}) returning id`);
      });
      sterse += rez.length;
    } catch (e) {
      raporteazaEroare("statistici-campanii-retentie", e, { orgId: org.id });
    }
  }
  // Site-ul platformei (fără organizație): aceleași reguli, în contextul echipei platformei.
  try {
    atribSterse += await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.platform_admin', 'true', true)`);
      await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
      const ev = await tx.execute(sql`delete from atrib_evenimente where org_id is null and ziua < (timezone('Europe/Bucharest', now()))::date - make_interval(months => ${LUNI_RETENTIE}) returning id`);
      await tx.execute(sql`update atrib_conversii set vizitator_id = null, sesiune_id = null where org_id is null and vizitator_id is not null and conversie_la < now() - make_interval(months => ${LUNI_RETENTIE})`);
      await tx.execute(sql`delete from atrib_conversii c where c.org_id is null and ((c.tip = 'cont' and not exists (select 1 from organizations o where o.id = c.entitate_id)) or (c.tip = 'lead' and not exists (select 1 from interese_ong l where l.id = c.entitate_id)))`);
      return ev.length;
    });
  } catch (e) {
    raporteazaEroare("statistici-campanii-retentie", e, {});
  }
  // Programările (calendarul intern): datele persoanelor se păstrează 24 de luni de la data întâlnirii, apoi se șterg.
  let programariSterse = 0;
  try {
    programariSterse = await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.platform_admin', 'true', true)`);
      const r = await tx.execute(sql`delete from programari where start_la < now() - interval '24 months' returning id`);
      return r.length;
    });
  } catch (e) {
    raporteazaEroare("programari-retentie", e, {});
  }
  return NextResponse.json({ ok: true, evenimenteSterse: sterse, atribuireSterse: atribSterse, programariSterse });
}
