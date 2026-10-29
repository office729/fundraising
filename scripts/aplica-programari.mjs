/* Aplică documentation/programari.sql (rol migrator) + RLS-ul tabelelor noi. Idempotent.
 * Config/tipuri/disponibilitate/excepții: citire publică (app.programari_public) doar din codul serverului, scriere doar platformă (app.platform_admin).
 * Programări: public = citire/scriere prin codul serverului validat (app.programari_public); platformă = tot (app.platform_admin). */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8 });
const PUBLIC = "nullif(current_setting('app.programari_public', true), '') = 'true'";
const ADMIN = "nullif(current_setting('app.platform_admin', true), '') = 'true'";
const CITIRE_PUBLICA = ["programari_config", "programari_tipuri", "programari_disponibilitate", "programari_exceptii"];
const TOT_PUBLIC = ["programari"];
try {
  await sql.unsafe(readFileSync(new URL("../documentation/programari.sql", import.meta.url), "utf8"));
  for (const t of [...CITIRE_PUBLICA, ...TOT_PUBLIC]) {
    await sql.unsafe(`alter table ${t} enable row level security`);
    await sql.unsafe(`alter table ${t} force row level security`);
    await sql.unsafe(`drop policy if exists ${t}_platforma on ${t}`);
    await sql.unsafe(`create policy ${t}_platforma on ${t} using (${ADMIN}) with check (${ADMIN})`);
    await sql.unsafe(`drop policy if exists ${t}_publica on ${t}`);
    if (CITIRE_PUBLICA.includes(t)) await sql.unsafe(`create policy ${t}_publica on ${t} for select using (${PUBLIC})`);
    else await sql.unsafe(`create policy ${t}_publica on ${t} using (${PUBLIC}) with check (${PUBLIC})`);
    const rls = await sql`select relrowsecurity, relforcerowsecurity from pg_class where relname = ${t}`;
    const pol = await sql`select policyname, cmd from pg_policies where tablename = ${t}`;
    console.log(t, "| rls:", JSON.stringify(rls[0]), "| politici:", pol.map((p) => `${p.policyname}(${p.cmd})`).join(", "));
  }
} finally {
  await sql.end();
}
