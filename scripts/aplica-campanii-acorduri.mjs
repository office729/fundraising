/* Aplică documentation/campanii-acorduri.sql (rol migrator): cele cinci bife de acord/protecția datelor pe fundraising_pages. Idempotent. */
import { readFileSync } from "node:fs";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}
const sql = postgres(url, { connect_timeout: 8, onnotice: () => {} });
const COLOANE = ["minor", "acord_distribuire_minor", "anonimizat", "acord_retras", "acord_diagnostic"];
try {
  await sql.begin(async (tx) => {
    await tx.unsafe(readFileSync(new URL("../documentation/campanii-acorduri.sql", import.meta.url), "utf8"));
  });
  const col = await sql`select column_name, data_type, is_nullable, column_default from information_schema.columns where table_name = 'fundraising_pages' and column_name = any(${COLOANE}) order by 1`;
  console.log("coloane:", col.map((c) => `${c.column_name} ${c.data_type} nullable=${c.is_nullable} default=${c.column_default}`).join(" | ") || "LIPSESC");
  if (col.length !== COLOANE.length) process.exitCode = 1;
} finally {
  await sql.end();
}
