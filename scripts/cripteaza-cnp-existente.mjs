/* Criptează CNP-urile din formular230_submissions care au rămas în clar (rânduri create ÎNAINTE de criptare).
 * Idempotent — atinge doar rândurile al căror CNP nu începe cu "v1." (WHERE cnp NOT LIKE 'v1.%').
 * Formatul e identic cu src/lib/secret-box.ts: v1.<iv>.<tag>.<text criptat>, AES-256-GCM, toate în base64.
 *
 * Cere ORG_SECRETS_KEY (aceeași ca în Vercel) și MIGRATOR_DATABASE_URL — de aceea îl rulezi TU, local:
 *   node --env-file=.env.local scripts/cripteaza-cnp-existente.mjs
 *
 * După rulare, închide gaura și la nivel de bază de date (validează constrângerea f230_cnp_criptat, adăugată NOT VALID):
 *   alter table formular230_submissions validate constraint f230_cnp_criptat;
 */
import { createCipheriv, randomBytes } from "node:crypto";
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
const rawKey = process.env.ORG_SECRETS_KEY;
if (!url || !rawKey) {
  console.error("Lipsesc MIGRATOR_DATABASE_URL sau ORG_SECRETS_KEY din mediu.");
  process.exit(1);
}
const key = Buffer.from(rawKey, "base64");
if (key.length !== 32) {
  console.error("ORG_SECRETS_KEY trebuie să aibă 32 de octeți (base64).");
  process.exit(1);
}

function cripteaza(textClar) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const criptat = Buffer.concat([cipher.update(textClar, "utf8"), cipher.final()]);
  return ["v1", iv.toString("base64"), cipher.getAuthTag().toString("base64"), criptat.toString("base64")].join(".");
}

const sql = postgres(url, { connect_timeout: 8 });

// migrator NU are BYPASSRLS — vezi documentation/rls-setup.sql (același tipar ca la celelalte scripturi de backfill).
try {
  await sql`alter table formular230_submissions no force row level security`;
  const randuri = await sql`select id, cnp from formular230_submissions where cnp not like 'v1.%'`;
  for (const r of randuri) {
    await sql`update formular230_submissions set cnp = ${cripteaza(r.cnp)} where id = ${r.id} and cnp not like 'v1.%'`;
  }
  console.log(`Gata — ${randuri.length} CNP-uri criptate.`);
} finally {
  await sql`alter table formular230_submissions force row level security`;
  await sql.end();
}
