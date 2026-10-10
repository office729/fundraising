/* Aplică documentation/verificari-surse.sql pe baza de date (rol migrator), apoi politicile se (re)creează cu
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
  await sql.unsafe(readFileSync(new URL("../documentation/verificari-surse.sql", import.meta.url), "utf8"));
  const grants = await sql`select privilege_type from information_schema.role_table_grants where table_name = 'certificate_verificari' and grantee = 'app_user' order by 1`;
  const coloana = await sql`select column_name from information_schema.columns where table_name = 'fundraising_donations' and column_name = 'sursa_marketing'`;
  console.log("sursa_marketing:", coloana.length ? "există" : "LIPSEȘTE");
  console.log("grant-uri app_user pe certificate_verificari:", grants.map((g) => g.privilege_type).join(", ") || "NICIUNUL");
} finally {
  await sql.end();
}
