/* Aplică documentation/campanie-termen.sql (rol migrator). Idempotent. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8 });
try {
  await sql.unsafe(readFileSync(new URL("../documentation/campanie-termen.sql", import.meta.url), "utf8"));
  const col = await sql`select column_name, data_type, is_nullable from information_schema.columns where table_name = 'fundraising_pages' and column_name = 'termen'`;
  console.log("coloană:", col.map((c) => `${c.column_name} ${c.data_type} nullable=${c.is_nullable}`).join(" | ") || "LIPSEȘTE");
} finally {
  await sql.end();
}
