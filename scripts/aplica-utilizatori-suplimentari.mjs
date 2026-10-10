/* Aplică documentation/utilizatori-suplimentari.sql (rol migrator). Idempotent. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8 });
try {
  await sql.unsafe(readFileSync(new URL("../documentation/utilizatori-suplimentari.sql", import.meta.url), "utf8"));
  const col = await sql`select table_name, column_name, data_type, is_nullable, column_default from information_schema.columns where column_name = 'extra_users' and table_name in ('organizations', 'platform_payments') order by table_name`;
  console.log("coloane:", col.map((c) => `${c.table_name}.${c.column_name} ${c.data_type} nullable=${c.is_nullable} default=${c.column_default}`).join(" | ") || "LIPSESC");
} finally {
  await sql.end();
}
