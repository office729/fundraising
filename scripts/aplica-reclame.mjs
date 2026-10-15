/* Aplică documentation/reclame.sql (rol migrator) + RLS-ul tabelelor noi (izolare pe organizație, ca în restore-rls.mjs). Idempotent. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const TABELE = ["reclame_costuri", "reclame_campanii", "reclame_importuri", "donatie_atribuiri", "reclame_linkuri", "reclame_conexiuni"];
const sql = postgres(url, { connect_timeout: 8 });
try {
  await sql.unsafe(readFileSync(new URL("../documentation/reclame.sql", import.meta.url), "utf8"));
  for (const t of TABELE) {
    await sql.unsafe(`alter table ${t} enable row level security`);
    await sql.unsafe(`alter table ${t} force row level security`);
    try {
      await sql.unsafe(`create policy ${t}_tenant_isolation on ${t}
        using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
        with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)`);
    } catch (e) {
      if (!/already exists/i.test(e.message)) throw e;
    }
  }
  // Cronul de sincronizare listează conexiunile tuturor organizațiilor în contextul de încredere app.public_lookup (doar citire); scrie apoi pe fiecare organizație separat.
  try {
    await sql.unsafe(`create policy reclame_conexiuni_cron_citire on reclame_conexiuni for select using (nullif(current_setting('app.public_lookup', true), '') = 'true')`);
  } catch (e) {
    if (!/already exists/i.test(e.message)) throw e;
  }
  const rls = await sql`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname = any(${TABELE}) order by 1`;
  const pol = await sql`select tablename, policyname, cmd from pg_policies where tablename = any(${TABELE}) order by 1`;
  console.log("rls:", rls.map((r) => `${r.relname}=${r.relrowsecurity}/${r.relforcerowsecurity}`).join(" | "));
  console.log("politici:", pol.map((p) => `${p.tablename}.${p.policyname}(${p.cmd})`).join(", "));
} finally {
  await sql.end();
}
