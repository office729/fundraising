/* Aplică documentation/donatori-profil.sql (rol migrator): starea adresei de e-mail și frecvența pe donatori_reali, tipul și rezultatul pe donator_notite. Idempotent. */
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
    await tx.unsafe(readFileSync(new URL("../documentation/donatori-profil.sql", import.meta.url), "utf8"));
  });
  const col = await sql`select table_name, column_name from information_schema.columns where (table_name = 'donatori_reali' and column_name in ('email_stare', 'email_stare_la', 'email_stare_motiv', 'frecventa_email', 'frecventa_email_la')) or (table_name = 'donator_notite' and column_name in ('tip', 'rezultat')) order by 1, 2`;
  console.log("coloane:", col.map((c) => `${c.table_name}.${c.column_name}`).join(", "));
} finally {
  await sql.end();
}
