/* Aplică documentation/waalaxy-outreach.sql (rol migrator): starea de outreach pe contacte și jurnalul evenimentelor Waalaxy (tabel cu RLS forțat). Idempotent. */
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
    await tx.unsafe(readFileSync(new URL("../documentation/waalaxy-outreach.sql", import.meta.url), "utf8"));
  });
  const rls = await sql`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname = 'outreach_evenimente'`;
  const pol = await sql`select policyname from pg_policies where tablename = 'outreach_evenimente'`;
  const col = await sql`select column_name from information_schema.columns where table_name = 'contacts' and column_name in ('outreach_stare', 'outreach_stare_la', 'email_status') order by 1`;
  console.log("rls:", rls.map((r) => `${r.relname}=${r.relrowsecurity}/${r.relforcerowsecurity}`).join(" | "));
  console.log("politici:", pol.map((p) => p.policyname).join(", "));
  console.log("coloane noi pe contacts:", col.map((c) => c.column_name).join(", "));
} finally {
  await sql.end();
}
