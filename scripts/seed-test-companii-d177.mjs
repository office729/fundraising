/* Adaugă 5 firme de test în Companii, cu contract semnat prin D177 —
 * la cererea utilizatorului, pentru verificare vizuală a modulului.
 * Prefixate [TEST AUTOMAT - de sters], ca să fie ușor de identificat și șters.
 *
 * Rulează cu: node --env-file=.env.local scripts/seed-test-companii-d177.mjs
 */
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}

const ORG_SLUG = "salveaza-o-inima";
const NUME_FIRME = [
  "[TEST AUTOMAT - de sters] Tehno Soluții SRL",
  "[TEST AUTOMAT - de sters] Verde Agro SRL",
  "[TEST AUTOMAT - de sters] Alfa Construct SRL",
  "[TEST AUTOMAT - de sters] Nord Logistic SRL",
  "[TEST AUTOMAT - de sters] Prima Media SRL",
];

const sql = postgres(url, { connect_timeout: 8 });

try {
  await sql`alter table organizations no force row level security`;
  await sql`alter table companies no force row level security`;

  const [org] = await sql`select id from organizations where slug = ${ORG_SLUG} limit 1`;
  if (!org) throw new Error(`Organizația cu slug "${ORG_SLUG}" nu a fost găsită.`);

  let create = 0;
  for (const nume of NUME_FIRME) {
    const existenta = await sql`select id from companies where org_id = ${org.id} and nume = ${nume} limit 1`;
    if (existenta[0]) continue;
    await sql`
      insert into companies (org_id, nume, judet, d177, contract_status, numar_contract, data_semnare)
      values (${org.id}, ${nume}, 'Cluj', true, 'semnat', ${"D177-" + Math.floor(1000 + Math.random() * 9000)}, current_date)
    `;
    create++;
  }
  console.log(`OK — ${create} firme de test create (din ${NUME_FIRME.length}), org ${ORG_SLUG}.`);
} finally {
  await sql`alter table organizations force row level security`;
  await sql`alter table companies force row level security`;
  await sql.end();
}
