/* Aplică documentation/personalizare-organizatie.sql (rol migrator): tabelul org_personalizare + RLS. Idempotent. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8 });
try {
  // Fiecare instrucțiune separat, ca „policy already exists” la a doua rulare să nu oprească restul.
  const text = readFileSync(new URL("../documentation/personalizare-organizatie.sql", import.meta.url), "utf8");
  const instructiuni = text
    .split("\n")
    .filter((l) => !l.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const i of instructiuni) {
    try {
      await sql.unsafe(i);
    } catch (e) {
      if (!/already exists/i.test(e.message)) throw e;
    }
  }
  const rls = await sql`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname = 'org_personalizare'`;
  const pol = await sql`select policyname, cmd from pg_policies where tablename = 'org_personalizare' order by 1`;
  console.log("rls:", rls.map((r) => `${r.relname}=${r.relrowsecurity}/${r.relforcerowsecurity}`).join(" | "));
  console.log("politici:\n" + pol.map((p) => `  ${p.policyname} (${p.cmd})`).join("\n"));
} finally {
  await sql.end();
}
