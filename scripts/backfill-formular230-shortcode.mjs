/* Generează un cod scurt (tip Bitly) pentru conturile de Formular 230 create
 * ÎNAINTE de introducerea link-urilor scurte (/s/<cod>) — cele noi îl primesc
 * automat la creare. Idempotent — sigur de rulat din nou (WHERE short_code IS NULL).
 *
 * Rulează cu: node --env-file=.env.local scripts/backfill-formular230-shortcode.mjs
 */
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}

const ALFABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function codScurt(lungime = 7) {
  let cod = "";
  for (let i = 0; i < lungime; i++) cod += ALFABET[Math.floor(Math.random() * ALFABET.length)];
  return cod;
}

const sql = postgres(url, { connect_timeout: 8 });

// migrator NU are BYPASSRLS — vezi documentation/rls-setup.sql.
try {
  await sql`alter table formular230_beneficiari no force row level security`;
  const fara = await sql`select id from formular230_beneficiari where short_code is null`;
  let actualizate = 0;
  for (const row of fara) {
    let cod = codScurt();
    for (let attempt = 0; attempt < 10; attempt++) {
      const [conflict] = await sql`select 1 from formular230_beneficiari where short_code = ${cod}`;
      if (!conflict) break;
      cod = codScurt();
    }
    await sql`update formular230_beneficiari set short_code = ${cod} where id = ${row.id}`;
    actualizate++;
  }
  console.log(`Backfill OK — ${actualizate} conturi au primit cod scurt.`);
} finally {
  await sql`alter table formular230_beneficiari force row level security`;
  await sql.end();
}
