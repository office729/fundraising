/* Configurează bucket-ul Supabase Storage pentru imagini de campanie (poză
 * copertă pagină + poze la actualizări de proiect) — rulat o singură dată
 * (idempotent, sigur de rulat din nou). Storage e schema `storage`, gestionată
 * de Supabase — nu trece prin drizzle-kit (care vede doar schema `public`),
 * de-aici acest script separat, urmând convenția din restore-rls.mjs.
 *
 * Bucket PUBLIC (citire liberă, fără RLS — Supabase servește direct fișierele
 * unui bucket public prin URL). Upload permis DOAR utilizatorilor autentificați
 * (auth.role() = 'authenticated') — pozele se încarcă din CRM (Adaugă pagină /
 * Adaugă actualizare), nu din fluxul public de donații.
 *
 * Rulează cu: node --env-file=.env.local scripts/setup-storage.mjs
 */
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}

const BUCKET_ID = "campanii";
const sql = postgres(url, { connect_timeout: 8 });

try {
  await sql`
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (${BUCKET_ID}, ${BUCKET_ID}, true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
    on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp','image/gif']
  `;

  const policies = [
    `create policy campanii_authenticated_upload on storage.objects for insert to authenticated with check (bucket_id = '${BUCKET_ID}')`,
    `create policy campanii_authenticated_update on storage.objects for update to authenticated using (bucket_id = '${BUCKET_ID}')`,
    `create policy campanii_authenticated_delete on storage.objects for delete to authenticated using (bucket_id = '${BUCKET_ID}')`,
    `create policy campanii_public_read on storage.objects for select using (bucket_id = '${BUCKET_ID}')`,
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

  console.log(`Storage OK — bucket "${BUCKET_ID}" (public, 5MB, imagini), ${created} politici noi create.`);
} finally {
  await sql.end();
}
