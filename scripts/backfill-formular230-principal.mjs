/* Creează contul implicit "principal" de Formular 230 pentru organizațiile
 * existente, create ÎNAINTE de introducerea conturilor/subconturilor multiple
 * (src/app/(auth)/signup/actions.ts îl creează automat pentru cele noi).
 * Idempotent — sigur de rulat din nou (WHERE NOT EXISTS).
 *
 * Rulează cu: node --env-file=.env.local scripts/backfill-formular230-principal.mjs
 */
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}

const sql = postgres(url, { connect_timeout: 8 });

// migrator NU are BYPASSRLS (vezi documentation/rls-setup.sql) — iar ambele
// tabele au FORCE ROW LEVEL SECURITY. Fără context, SELECT-ul din organizations
// (folosit în subquery-ul de mai jos) și INSERT-ul în formular230_beneficiari
// ar întoarce/insera 0 rânduri în tăcere (fail-closed), nu o eroare — de-aici
// atât GUC-ul app.public_lookup (citire organizations), cât și scoaterea
// temporară a FORCE pe formular230_beneficiari (insert), exact ca la
// curățarea de date de test din organizations.
try {
  await sql`alter table formular230_beneficiari no force row level security`;
  await sql`alter table formular230_submissions no force row level security`;
  const [rows, atribuite] = await sql.begin(async (tx) => {
    await tx`select set_config('app.public_lookup', 'true', true)`;
    const inserate = await tx`
      insert into formular230_beneficiari (org_id, nume, slug)
      select o.id, o.name, 'principal'
      from organizations o
      where not exists (
        select 1 from formular230_beneficiari b
        where b.org_id = o.id and b.slug = 'principal'
      )
      returning org_id
    `;
    // Răspunsurile trimise ÎNAINTE de acest cont (beneficiar_id null) trebuie
    // atribuite contului "principal", altfel numărul de formulare afișat la el
    // în panou nu ar include istoricul.
    const legate = await tx`
      update formular230_submissions s
      set beneficiar_id = b.id
      from formular230_beneficiari b
      where s.beneficiar_id is null and b.org_id = s.org_id and b.slug = 'principal'
      returning s.id
    `;
    return [inserate, legate];
  });
  console.log(`Backfill OK — ${rows.length} organizații au primit contul "principal", ${atribuite.length} răspunsuri vechi au fost atribuite lui.`);
} finally {
  await sql`alter table formular230_beneficiari force row level security`;
  await sql`alter table formular230_submissions force row level security`;
  await sql.end();
}
