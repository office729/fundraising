/* Aplică documentation/api-campuri.sql (rol migrator): câmpuri personalizate, chei API, webhook-uri (tabele cu RLS forțat; coloana „campuri” pe donatori_reali și companies). Idempotent. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8, onnotice: () => {} });
const TABELE = ["campuri_personalizate", "api_chei", "webhook_endpointuri", "webhook_livrari"];
try {
  await sql.begin(async (tx) => {
    await tx.unsafe(readFileSync(new URL("../documentation/api-campuri.sql", import.meta.url), "utf8"));
  });
  const rls = await sql`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname = any(${TABELE}) order by 1`;
  const pol = await sql`select tablename, policyname from pg_policies where tablename = any(${TABELE}) order by 1, 2`;
  const col = await sql`select table_name from information_schema.columns where column_name = 'campuri' and table_name in ('donatori_reali', 'companies') order by 1`;
  console.log("rls:", rls.map((r) => `${r.relname}=${r.relrowsecurity}/${r.relforcerowsecurity}`).join(" | "));
  console.log("politici:", pol.map((p) => p.policyname).join(", "));
  console.log("coloana campuri pe:", col.map((c) => c.table_name).join(", "));
} finally {
  await sql.end();
}
