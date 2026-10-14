/* Aplică documentation/granturi.sql (rol migrator) + RLS-ul tabelelor noi (aceleași politici ca în restore-rls.mjs). Idempotent.
 * (restore-rls.mjs rulat întreg se oprește pe tabele deținute de alt rol; aici se aplică doar ce ține de tabelele noi.) */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const TABELE = ["granturi", "granturi_dosar"];
const sql = postgres(url, { connect_timeout: 8 });
try {
  await sql.unsafe(readFileSync(new URL("../documentation/granturi.sql", import.meta.url), "utf8"));
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
  const rls = await sql`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname in ('granturi','granturi_dosar') order by 1`;
  const pol = await sql`select tablename, policyname, cmd from pg_policies where tablename in ('granturi','granturi_dosar') order by 1`;
  const g = await sql`select table_name, string_agg(privilege_type, ',' order by privilege_type) p from information_schema.role_table_grants where table_name in ('granturi','granturi_dosar') and grantee = 'app_user' group by table_name order by 1`;
  console.log("rls:", rls.map((r) => `${r.relname}=${r.relrowsecurity}/${r.relforcerowsecurity}`).join(" | "));
  console.log("politici:", pol.map((p) => `${p.tablename}.${p.policyname}(${p.cmd})`).join(", "));
  console.log("grant-uri app_user:", g.map((x) => `${x.table_name}=${x.p}`).join(" | "));
} finally {
  await sql.end();
}
