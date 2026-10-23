/* Aplică documentation/prospectare.sql (rol migrator) + RLS-ul tabelelor noi (izolare pe organizație). Idempotent. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8 });
const ORG = `org_id = nullif(current_setting('app.current_org_id', true), '')::uuid`;
const TABELE = ["prospectare_chei", "prospectare_candidati", "prospectare_jurnal", "prospectare_suprimati"];
try {
  await sql.unsafe(readFileSync(new URL("../documentation/prospectare.sql", import.meta.url), "utf8"));
  for (const t of TABELE) {
    await sql.unsafe(`alter table ${t} enable row level security`);
    await sql.unsafe(`alter table ${t} force row level security`);
    try {
      await sql.unsafe(`create policy ${t}_tenant_isolation on ${t} using (${ORG}) with check (${ORG})`);
    } catch (e) {
      if (!/already exists/i.test(e.message)) throw e;
    }
  }
  const rls = await sql`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname = any(${TABELE}) order by 1`;
  const pol = await sql`select tablename, policyname from pg_policies where tablename = any(${TABELE}) order by 1`;
  console.log("rls:", rls.map((r) => `${r.relname}=${r.relrowsecurity}/${r.relforcerowsecurity}`).join(" | "));
  console.log("politici:", pol.map((p) => p.policyname).join(", "));
} finally {
  await sql.end();
}
