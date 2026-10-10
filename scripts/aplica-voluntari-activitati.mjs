/* Aplică documentation/voluntari-activitati.sql pe baza de date (rol migrator), apoi politicile se (re)creează cu
 *   node --env-file=.env.local scripts/restore-rls.mjs
 * Idempotent: poate fi rulat de mai multe ori. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8 });
try {
  await sql.unsafe(readFileSync(new URL("../documentation/voluntari-activitati.sql", import.meta.url), "utf8"));
  const tabele = await sql`select table_name from information_schema.tables where table_name in ('volunteer_tasks','volunteer_task_engagements','volunteer_activities','volunteer_shifts','volunteer_signups','volunteer_reports') order by 1`;
  const grants = await sql`select table_name, string_agg(privilege_type, ',' order by privilege_type) p from information_schema.role_table_grants where table_name like 'volunteer_%' and grantee = 'app_user' group by table_name order by 1`;
  console.log("tabele:", tabele.map((t) => t.table_name).join(", "));
  console.log("grant-uri app_user:", grants.map((g) => `${g.table_name}=${g.p}`).join(" | "));
} finally {
  await sql.end();
}
