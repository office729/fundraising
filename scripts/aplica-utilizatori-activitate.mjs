/* Aplică documentation/utilizatori-activitate.sql (rol migrator): trei coloane pe app_users. Idempotent. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8, onnotice: () => {} });
try {
  await sql.unsafe(readFileSync(new URL("../documentation/utilizatori-activitate.sql", import.meta.url), "utf8"));
  const col = await sql`select column_name from information_schema.columns where table_name = 'app_users' and column_name = any(${["first_login_at", "last_seen_at", "last_action_at"]}) order by 1`;
  console.log("coloane:", col.map((c) => c.column_name).join(", "));
} finally {
  await sql.end();
}
