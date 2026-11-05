/* Aplică documentation/surse-donatii.sql (rol migrator): tabelul donatie_surse, cu RLS forțat și politică de izolare pe organizație. Idempotent. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8, onnotice: () => {} });
const TABELE = ["donatie_surse"];
try {
  await sql.begin(async (tx) => {
    await tx.unsafe(readFileSync(new URL("../documentation/surse-donatii.sql", import.meta.url), "utf8"));
  });
  const rls = await sql`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname = any(${TABELE}) order by 1`;
  const pol = await sql`select tablename, policyname from pg_policies where tablename = any(${TABELE}) order by 1`;
  const grant = await sql`select privilege_type from information_schema.role_table_grants where table_name = 'donatie_surse' and grantee = 'app_user' order by 1`;
  console.log("rls:", rls.map((r) => `${r.relname}=${r.relrowsecurity}/${r.relforcerowsecurity}`).join(" | "));
  console.log("politici:", pol.map((p) => p.policyname).join(", "));
  console.log("drepturi app_user:", grant.map((g) => g.privilege_type).join(", "));
} finally {
  await sql.end();
}
