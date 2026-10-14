-- Politicile bucket-ului PRIVAT `org-docs-private` (Supabase Storage; schema `storage`, deci nu trece prin drizzle-kit și nu se poate rula cu rolul de migrare din scripts/).
-- Aici stau: atașamentele cererilor de granturi (<slug>/granturi/…), documentele firmelor (<slug>/companii/…), facturi și atașamente de task.
--
-- ⚠️ DE RULAT ÎN SUPABASE (SQL Editor, rol postgres). Nu am putut verifica politicile existente din cod (rolul de migrare nu are acces la schema `storage`).
-- PASUL 1 — vezi ce politici există acum pentru bucket și caută-le pe cele prea largi (de ex. „orice authenticated citește/scrie în tot bucketul”):
--
--   select policyname, cmd, roles, qual, with_check
--   from pg_policies
--   where schemaname = 'storage' and tablename = 'objects'
--     and (qual ilike '%org-docs-private%' or with_check ilike '%org-docs-private%')
--   order by policyname;
--
-- PASUL 2 — o politică care NU cere apartenența la organizația din primul folder al căii (<slug>/…) trebuie ștearsă:
--   drop policy "<numele politicii prea largi>" on storage.objects;
--
-- PASUL 3 — rulează restul fișierului (idempotent): funcția de apartenență (aceeași ca în storage-policies.sql) și politicile pe membri.
-- Politicile de mai jos NU înlocuiesc accesul beneficiarilor la facturile propriei campanii: dacă el există ca politică separată, păstreaz-o
-- (verifică la pasul 1 că nu cere doar „authenticated”).

create schema if not exists app_private;
grant usage on schema app_private to authenticated;

create or replace function app_private.storage_membru_org(p_cale text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.memberships m
    join public.app_users u on u.id = m.user_id
    join public.organizations o on o.id = m.org_id
    where lower(u.email) = lower(auth.jwt() ->> 'email')
      and (
        ((storage.foldername(p_cale))[1] <> 'newsletter' and o.slug = (storage.foldername(p_cale))[1])
        or ((storage.foldername(p_cale))[1] = 'newsletter' and o.id::text = (storage.foldername(p_cale))[2])
      )
  );
$$;
revoke all on function app_private.storage_membru_org(text) from public, anon;
grant execute on function app_private.storage_membru_org(text) to authenticated;

-- Bucket privat (fără acces public); limitele de mărime/tip rămân cele deja setate de aplicație.
update storage.buckets set public = false where id = 'org-docs-private';

drop policy if exists org_docs_private_member_select on storage.objects;
drop policy if exists org_docs_private_member_insert on storage.objects;
drop policy if exists org_docs_private_member_delete on storage.objects;

create policy org_docs_private_member_select on storage.objects
  for select to authenticated
  using (bucket_id = 'org-docs-private' and app_private.storage_membru_org(name));

create policy org_docs_private_member_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'org-docs-private' and app_private.storage_membru_org(name));

create policy org_docs_private_member_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'org-docs-private' and app_private.storage_membru_org(name));

-- Verificare: ar trebui să vezi cele trei politici de mai sus și nicio politică mai largă pe acest bucket.
-- select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and (qual ilike '%org-docs-private%' or with_check ilike '%org-docs-private%');
