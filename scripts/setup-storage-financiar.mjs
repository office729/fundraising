/* Configurează bucket-ul Supabase Storage pentru documentele financiare
 * (Balanța/Bilanțul) ale modulului „Raport de activitate companii" — rulat o
 * singură dată (idempotent, sigur de rulat din nou), urmând convenția din
 * setup-storage.mjs (bucket-ul `campanii`).
 *
 * Bucket PRIVAT (spre deosebire de `campanii`) — documente financiare, nu
 * imagini publice. Politicile de mai jos permit citire/scriere oricărui
 * utilizator autentificat (`to authenticated`), la fel ca la `campanii`;
 * izolarea REALĂ pe organizație vine din server actions (withOrgAdmin) care
 * gardează orice upload/citire ÎNAINTE de a atinge storage-ul, plus căi de
 * fișier prefixate cu org_id (UUID, neghicibil) — RLS-ul Supabase Storage nu
 * poate vedea GUC-urile custom (app.current_org_id) setate în tranzacțiile
 * Drizzle, doar auth.uid(); a verifica apartenența la organizație direct în
 * politica de storage ar cere un subquery pe memberships, neconstruit acum,
 * consistent cu bucket-ul `campanii` existent.
 *
 * Rulează cu: node --env-file=.env.local scripts/setup-storage-financiar.mjs
 */
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}

const BUCKET_ID = "org-financial-docs";
const sql = postgres(url, { connect_timeout: 8 });

try {
  await sql`
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (${BUCKET_ID}, ${BUCKET_ID}, false, 10485760, array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ])
    on conflict (id) do update set public = false, file_size_limit = 10485760, allowed_mime_types = array[
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
  `;

  const policies = [
    `create policy org_financial_docs_authenticated_upload on storage.objects for insert to authenticated with check (bucket_id = '${BUCKET_ID}')`,
    `create policy org_financial_docs_authenticated_update on storage.objects for update to authenticated using (bucket_id = '${BUCKET_ID}')`,
    `create policy org_financial_docs_authenticated_delete on storage.objects for delete to authenticated using (bucket_id = '${BUCKET_ID}')`,
    // Fără politică de citire publică (spre deosebire de `campanii`) — bucket
    // privat; citirea din UI merge prin createSignedUrl (server, deja gardat
    // de withOrgAdmin), nu prin URL public direct.
    `create policy org_financial_docs_authenticated_read on storage.objects for select to authenticated using (bucket_id = '${BUCKET_ID}')`,
  ];

  let created = 0;
  for (const stmt of policies) {
    try {
      await sql.unsafe(stmt);
      created++;
    } catch (e) {
      if (!/already exists/i.test(e.message)) throw e;
    }
  }

  console.log(`Storage OK — bucket "${BUCKET_ID}" (privat, 10MB, PDF/XLSX), ${created} politici noi create.`);
} finally {
  await sql.end();
}
