/* Aplică documentation/statistici-campanii.sql (rol migrator) + RLS-ul tabelului nou (aceeași politică ca în restore-rls.mjs). Idempotent.
 * (restore-rls.mjs rulat întreg se oprește pe tabele deținute de alt rol; aici se aplică doar ce ține de tabelul nou.) */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8 });
try {
  await sql.unsafe(readFileSync(new URL("../documentation/statistici-campanii.sql", import.meta.url), "utf8"));
  await sql.unsafe("alter table campaign_page_events enable row level security");
  await sql.unsafe("alter table campaign_page_events force row level security");
  try {
    await sql.unsafe(`create policy campaign_page_events_tenant_isolation on campaign_page_events
      using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
      with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)`);
  } catch (e) {
    if (!/already exists/i.test(e.message)) throw e;
  }
  const rls = await sql`select relrowsecurity, relforcerowsecurity from pg_class where relname = 'campaign_page_events'`;
  const pol = await sql`select policyname, cmd from pg_policies where tablename = 'campaign_page_events'`;
  const g = await sql`select string_agg(privilege_type, ',' order by privilege_type) p from information_schema.role_table_grants where table_name = 'campaign_page_events' and grantee = 'app_user'`;
  console.log("rls:", JSON.stringify(rls[0]), "| politici:", pol.map((p) => `${p.policyname}(${p.cmd})`).join(", "), "| grant-uri app_user:", g[0]?.p);
} finally {
  await sql.end();
}
