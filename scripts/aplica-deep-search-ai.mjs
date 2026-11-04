/* Aplică documentation/deep-search-ai.sql (rol migrator): coloane noi pe prospectare_candidati și contacts, tabelul deep_search_ai cu RLS forțat, indecși. Idempotent. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8, onnotice: () => {} });
const TABELE = ["deep_search_ai"];
try {
  await sql.begin(async (tx) => {
    await tx.unsafe(readFileSync(new URL("../documentation/deep-search-ai.sql", import.meta.url), "utf8"));
  });
  const rls = await sql`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname = any(${TABELE}) order by 1`;
  const pol = await sql`select tablename, policyname from pg_policies where tablename = any(${TABELE}) order by 1`;
  const col = await sql`select table_name, column_name from information_schema.columns where (table_name = 'prospectare_candidati' and column_name in ('telefon','ids','alte_surse','cerere_lusha','sursa_url')) or (table_name = 'contacts' and column_name = 'provenienta') order by 1, 2`;
  console.log("rls:", rls.map((r) => `${r.relname}=${r.relrowsecurity}/${r.relforcerowsecurity}`).join(" | "));
  console.log("politici:", pol.map((p) => p.policyname).join(", "));
  console.log("coloane:", col.map((c) => `${c.table_name}.${c.column_name}`).join(", "));
} finally {
  await sql.end();
}
