/* Aplică documentation/interese-ong.sql (rol migrator): tabelul listei de lead-uri, RLS forțat cu politici pentru formularul public și pentru echipa platformei. Idempotent. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8, onnotice: () => {} });
const TABELE = ["interese_ong"];
try {
  await sql.begin(async (tx) => {
    await tx.unsafe(readFileSync(new URL("../documentation/interese-ong.sql", import.meta.url), "utf8"));
  });
  const rls = await sql`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname = any(${TABELE}) order by 1`;
  const pol = await sql`select tablename, policyname from pg_policies where tablename = any(${TABELE}) order by 1`;
  console.log("rls:", rls.map((r) => `${r.relname}=${r.relrowsecurity}/${r.relforcerowsecurity}`).join(" | "));
  console.log("politici:", pol.map((p) => p.policyname).join(", "));
} finally {
  await sql.end();
}
