/* Aplică documentation/notificari-oprite.sql (rol migrator) + RLS (contextul de încredere app.public_lookup). Idempotent. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8 });
try {
  await sql.unsafe(readFileSync(new URL("../documentation/notificari-oprite.sql", import.meta.url), "utf8"));
  await sql.unsafe(`alter table notificari_oprite enable row level security`);
  await sql.unsafe(`alter table notificari_oprite force row level security`);
  try {
    await sql.unsafe(`create policy notificari_oprite_public_lookup on notificari_oprite for all
      using (nullif(current_setting('app.public_lookup', true), '') = 'true')
      with check (nullif(current_setting('app.public_lookup', true), '') = 'true')`);
  } catch (e) {
    if (!/already exists/i.test(e.message)) throw e;
  }
  const rls = await sql`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname = 'notificari_oprite'`;
  const pol = await sql`select policyname, cmd from pg_policies where tablename = 'notificari_oprite'`;
  console.log("rls:", rls.map((r) => `${r.relname}=${r.relrowsecurity}/${r.relforcerowsecurity}`).join(" | "));
  console.log("politici:", pol.map((p) => `${p.policyname}(${p.cmd})`).join(", "));
} finally {
  await sql.end();
}
