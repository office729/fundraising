/* Aplică documentation/agent-email.sql (rol migrator): conturile de email pe utilizator, ciornele și mesajele trimise, răspunsurile etichetate, PDF-urile atașate, contorul zilnic și setările agentului email, cu RLS forțat și politică de izolare pe organizație. Idempotent. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8, onnotice: () => {} });
const TABELE = ["agent_email_conturi", "agent_email_mesaje", "agent_email_raspunsuri", "agent_email_pdf", "agent_email_contor", "agent_email_setari"];
try {
  await sql.begin(async (tx) => {
    await tx.unsafe(readFileSync(new URL("../documentation/agent-email.sql", import.meta.url), "utf8"));
  });
  const rls = await sql`select relname, relrowsecurity, relforcerowsecurity from pg_class where relname = any(${TABELE}) order by 1`;
  const pol = await sql`select tablename, policyname from pg_policies where tablename = any(${TABELE}) order by 1, 2`;
  console.log("rls:", rls.map((r) => `${r.relname}=${r.relrowsecurity}/${r.relforcerowsecurity}`).join(" | "));
  console.log("politici:", pol.map((p) => p.policyname).join(", "));
} finally {
  await sql.end();
}
