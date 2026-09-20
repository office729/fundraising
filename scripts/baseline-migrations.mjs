/* Marchează migrarea de bază (0000_baseline) ca „deja aplicată" pe o bază care a
 * fost construită până acum cu `drizzle-kit push`. Fără asta, `npm run db:migrate`
 * ar încerca să recreeze tabelele care există deja.
 *
 * NU rulează SQL-ul migrării — doar înregistrează hash-ul ei în
 * drizzle.__drizzle_migrations, exact cum ar face drizzle-kit după o aplicare reușită.
 *
 *   node --env-file=.env.local scripts/baseline-migrations.mjs           (previzualizare, nu scrie nimic)
 *   node --env-file=.env.local scripts/baseline-migrations.mjs --apply   (scrie înregistrarea)
 *
 * Rulează-l O SINGURĂ DATĂ pe fiecare bază (producție, staging), după ce ai verificat
 * că schema din bază corespunde cu src/lib/db/schema (ex. `npx drizzle-kit push` fără
 * modificări propuse). Folosește MIGRATOR_DATABASE_URL.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const aplica = process.argv.includes("--apply");

const dir = "src/lib/db/migrations";
const jurnal = JSON.parse(readFileSync(`${dir}/meta/_journal.json`, "utf8"));
const baza = jurnal.entries.find((e) => e.tag.endsWith("_baseline"));
if (!baza) {
  console.error("Nu găsesc migrarea *_baseline în jurnal.");
  process.exit(1);
}
const hash = createHash("sha256").update(readFileSync(`${dir}/${baza.tag}.sql`, "utf8")).digest("hex");

const sql = postgres(url, { connect_timeout: 8, max: 1 });
try {
  const [{ tabel }] = await sql`select to_regclass('drizzle.__drizzle_migrations') as tabel`;
  if (!tabel && aplica) {
    await sql`create schema if not exists drizzle`;
    await sql`create table drizzle.__drizzle_migrations (id serial primary key, hash text not null, created_at bigint)`;
  }
  const existente = tabel || aplica ? await sql`select id from drizzle.__drizzle_migrations where hash = ${hash}` : [];
  if (existente.length) {
    console.log("Baseline-ul e deja înregistrat. Nimic de făcut.");
  } else if (!aplica) {
    console.log(`Previzualizare: aș înregistra ${baza.tag} (hash ${hash.slice(0, 12)}…). Rulează cu --apply ca să scrie.`);
  } else {
    await sql`insert into drizzle.__drizzle_migrations (hash, created_at) values (${hash}, ${baza.when})`;
    console.log(`Înregistrat ${baza.tag} ca aplicat.`);
  }
} finally {
  await sql.end();
}
