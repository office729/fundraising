import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { cronAutorizat } from "@/lib/cron-auth";
import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { anonimizeazaEmailuriExpirate, expiraInfluenceriBlocati } from "@/lib/gdpr-module-noi";
import { raporteazaEroare } from "@/lib/monitoring";

// Rulat zilnic (vercel.json) — retenție GDPR pentru persoanele găsite dar încă neaprobate: cele din lista „De aprobat” a unei
// firme (companies.extra.deAprobat) mai vechi de 60 de zile se șterg efectiv. Intrările fără dată (create înainte de această
// regulă) primesc acum data zilei, ca să expire și ele peste 60 de zile.
// NOTĂ: în acest proiect nu există un cache de „rezultate de căutare memorate” — nu are ce să se șteargă din el.
// Retenție pentru Agentul email: emailurile TRIMISE (agent_email_mesaje.stare = 'trimis') și răspunsurile primite la ele păstrează datele destinatarului
// 24 de luni de la trimitere; apoi destinatarul, textul și istoricul se anonimizează („[expirat]”), iar rândul rămâne pentru statistici.
// Analizele ONG (analize_ong) și căutările profunde AI (deep_search_ai) nu fac parte din regula asta. Logica e în lib/gdpr-module-noi.ts (testată pe baza reală).
// Retenție pentru Influenceri: fișele marcate „Nu mai contactăm” de peste 12 luni se reduc la amprentele de excludere (ca la ștergerea la cerere).
const ZILE_NEAPROBATE = 60;

export async function GET(req: Request) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: "cron_neconfigurat" }, { status: 501 });
  if (!cronAutorizat(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const orgs = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    return tx.select({ id: organizations.id }).from(organizations);
  });

  let firmeCurate = 0;
  for (const org of orgs) {
    try {
      const rez = await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.current_org_id', ${org.id}, true)`);
        // CASE: `jsonb_array_length` pe o valoare care nu e array ar da eroare, iar ordinea condițiilor AND nu e garantată.
        const curate = await tx.execute(sql`
          update companies c set extra = jsonb_set(coalesce(c.extra, '{}'::jsonb), '{deAprobat}', coalesce((
            select jsonb_agg(e || jsonb_build_object('adaugatLa', coalesce(e->>'adaugatLa', now()::text)))
            from jsonb_array_elements(c.extra->'deAprobat') e
            where coalesce((e->>'adaugatLa')::timestamptz, now()) > now() - make_interval(days => ${ZILE_NEAPROBATE})
          ), '[]'::jsonb))
          where c.org_id = ${org.id}
            and case when jsonb_typeof(c.extra->'deAprobat') = 'array' then jsonb_array_length(c.extra->'deAprobat') > 0 else false end
          returning c.id`);
        // Candidații găsiți de furnizori / AI și neaprobați în 60 de zile își pierd datele personale (amprenta „nu mai căuta” rămâne în firmă); la fel memoria căutărilor AI veche.
        await tx.execute(sql`
          update prospectare_candidati set nume = '[expirat]', nume_norm = 'expirat:' || id::text, rol = null, dept = null, linkedin = null, email = null, email_status = null,
            telefon = null, ids = '{}'::jsonb, alte_surse = '{}'::text[], cerere_lusha = null, sursa_url = null, eticheta = null, stadiu = 'inchis', urmator_pas_la = null
          where org_id = ${org.id} and stare = 'nou' and gasit_la < now() - make_interval(days => ${ZILE_NEAPROBATE}) and nume <> '[expirat]' and nume <> '[respins]' and nume <> '[șters]'`);
        // Emailurile trimise de peste 24 de luni, într-un punct de salvare: o eroare aici nu anulează curățarea candidaților de mai sus.
        try {
          await tx.transaction((sp) => anonimizeazaEmailuriExpirate(sp as unknown as typeof db, org.id));
        } catch (e) {
          raporteazaEroare("gdpr-email-retentie", e, { orgId: org.id });
        }
        // Influencerii „Nu mai contactăm” de peste 12 luni se reduc la amprentele de excludere; tot într-un punct de salvare, ca să nu strice restul curățării.
        try {
          const r = await tx.transaction((sp) => expiraInfluenceriBlocati(sp as unknown as typeof db, org.id));
          if (r.esuate > 0) raporteazaEroare("gdpr-influenceri-retentie", r.primaEroare, { orgId: org.id, esuate: r.esuate });
        } catch (e) {
          raporteazaEroare("gdpr-influenceri-retentie", e, { orgId: org.id });
        }
        return curate;
      });
      firmeCurate += rez.length;
    } catch (e) {
      raporteazaEroare("gdpr-persoane-retentie", e, { orgId: org.id });
    }
  }
  return NextResponse.json({ ok: true, firmeVerificate: firmeCurate });
}
