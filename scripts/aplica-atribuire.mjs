/* Aplică documentation/atribuire.sql (rol migrator) + RLS-ul tabelelor noi (aceleași politici ca în restore-rls.mjs). Idempotent.
 * (restore-rls.mjs rulat întreg se oprește pe tabele deținute de alt rol; aici se aplică doar ce ține de tabelele noi.) */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8 });
const TABELE = ["atrib_evenimente", "atrib_conversii"];
const politici = (t) => [
  [`${t}_tenant_isolation`, `create policy ${t}_tenant_isolation on ${t}
    using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
    with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)`],
  [`${t}_site`, `create policy ${t}_site on ${t}
    using      (org_id is null and nullif(current_setting('app.atribuire_site', true), '') = 'true')
    with check (org_id is null and nullif(current_setting('app.atribuire_site', true), '') = 'true')`],
  [`${t}_platforma`, `create policy ${t}_platforma on ${t}
    using      (nullif(current_setting('app.platform_admin', true), '') = 'true')
    with check (nullif(current_setting('app.platform_admin', true), '') = 'true')`],
];
try {
  await sql.unsafe(readFileSync(new URL("../documentation/atribuire.sql", import.meta.url), "utf8"));
  for (const t of TABELE) {
    await sql.unsafe(`alter table ${t} enable row level security`);
    await sql.unsafe(`alter table ${t} force row level security`);
    for (const [nume, ddl] of politici(t)) {
      await sql.unsafe(`drop policy if exists ${nume} on ${t}`);
      await sql.unsafe(ddl);
    }
    const rls = await sql`select relrowsecurity, relforcerowsecurity from pg_class where relname = ${t}`;
    const pol = await sql`select policyname, cmd from pg_policies where tablename = ${t}`;
    const g = await sql`select string_agg(privilege_type, ',' order by privilege_type) p from information_schema.role_table_grants where table_name = ${t} and grantee = 'app_user'`;
    console.log(t, "| rls:", JSON.stringify(rls[0]), "| politici:", pol.map((p) => `${p.policyname}(${p.cmd})`).join(", "), "| grant-uri app_user:", g[0]?.p);
  }
} finally {
  await sql.end();
}
