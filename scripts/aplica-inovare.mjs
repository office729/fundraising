/* Aplică documentation/inovare.sql (rol migrator) + RLS-ul tabelelor noi. Idempotent.
 * Citire: doar cu app.inovare_citire (setat de server după verificarea sesiunii). Scriere de către organizație: doar rânduri ale propriei organizații
 * (app.current_org_id). Echipa platformei: tot (app.platform_admin). */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8 });
const ADMIN = "nullif(current_setting('app.platform_admin', true), '') = 'true'";
const CITIRE = "nullif(current_setting('app.inovare_citire', true), '') = 'true'";
const ORG = "org_id = nullif(current_setting('app.current_org_id', true), '')::uuid";
try {
  await sql.unsafe(readFileSync(new URL("../documentation/inovare.sql", import.meta.url), "utf8"));
  for (const t of ["inovare_propuneri", "inovare_voturi"]) {
    await sql.unsafe(`alter table ${t} enable row level security`);
    await sql.unsafe(`alter table ${t} force row level security`);
    for (const p of ["platforma", "citire", "scriere_org", "modifica_org", "sterge_org"]) await sql.unsafe(`drop policy if exists ${t}_${p} on ${t}`);
    await sql.unsafe(`create policy ${t}_platforma on ${t} using (${ADMIN}) with check (${ADMIN})`);
    await sql.unsafe(`create policy ${t}_citire on ${t} for select using (${CITIRE})`);
    await sql.unsafe(`create policy ${t}_scriere_org on ${t} for insert with check (${ORG})`);
    if (t === "inovare_voturi") await sql.unsafe(`create policy ${t}_sterge_org on ${t} for delete using (${ORG})`);
    const rls = await sql`select relrowsecurity, relforcerowsecurity from pg_class where relname = ${t}`;
    const pol = await sql`select policyname, cmd from pg_policies where tablename = ${t}`;
    console.log(t, "| rls:", JSON.stringify(rls[0]), "| politici:", pol.map((p) => `${p.policyname}(${p.cmd})`).join(", "));
  }
} finally {
  await sql.end();
}
