/* Aplică documentation/donatori-igiena.sql (rol migrator): coloanele dovezii acordului pe donatori_reali și tabelul dubluri_respinse (RLS forțat). Idempotent. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8, onnotice: () => {} });
try {
  await sql.begin(async (tx) => {
    await tx.unsafe(readFileSync(new URL("../documentation/donatori-igiena.sql", import.meta.url), "utf8"));
  });
  const col = await sql`select column_name from information_schema.columns where table_name = 'donatori_reali' and column_name like 'consimtamant_email_%' order by 1`;
  const rls = await sql`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname = 'dubluri_respinse'`;
  const pol = await sql`select policyname from pg_policies where tablename = 'dubluri_respinse'`;
  console.log("coloane:", col.map((c) => c.column_name).join(", "));
  console.log("rls:", rls.map((r) => `${r.relname}=${r.relrowsecurity}/${r.relforcerowsecurity}`).join(" | "));
  console.log("politici:", pol.map((p) => p.policyname).join(", "));
} finally {
  await sql.end();
}
