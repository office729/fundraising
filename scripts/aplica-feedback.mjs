/* Aplică documentation/feedback.sql (rol migrator) + RLS-ul tabelului nou (aceleași politici ca în restore-rls.mjs). Idempotent. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8 });
const ORG = `org_id = nullif(current_setting('app.current_org_id', true), '')::uuid`;
const POLITICI = [
  `create policy feedback_platforma_citire on feedback_platforma for select using (${ORG})`,
  `create policy feedback_platforma_adaugare on feedback_platforma for insert with check (${ORG})`,
  // Echipa platformei: citește și răspunde peste toate organizațiile (rutele care setează GUC-ul sunt gardate cu isPlatformAdmin).
  `create policy feedback_platforma_admin on feedback_platforma for all
     using (nullif(current_setting('app.platform_admin', true), '') = 'true')
     with check (nullif(current_setting('app.platform_admin', true), '') = 'true')`,
];
try {
  await sql.unsafe(readFileSync(new URL("../documentation/feedback.sql", import.meta.url), "utf8"));
  await sql.unsafe(`alter table feedback_platforma enable row level security`);
  await sql.unsafe(`alter table feedback_platforma force row level security`);
  for (const p of POLITICI) {
    try {
      await sql.unsafe(p);
    } catch (e) {
      if (!/already exists/i.test(e.message)) throw e;
    }
  }
  const rls = await sql`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname = 'feedback_platforma'`;
  const pol = await sql`select policyname, cmd from pg_policies where tablename = 'feedback_platforma' order by 1`;
  const g = await sql`select string_agg(privilege_type, ',' order by privilege_type) p from information_schema.role_table_grants where table_name = 'feedback_platforma' and grantee = 'app_user'`;
  console.log("rls:", rls.map((r) => `${r.relname}=${r.relrowsecurity}/${r.relforcerowsecurity}`).join(" | "));
  console.log("politici:", pol.map((p) => `${p.policyname}(${p.cmd})`).join(", "));
  console.log("grant-uri app_user:", g[0]?.p);
} finally {
  await sql.end();
}
