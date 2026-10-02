-- Politicile Supabase Storage (schema `storage`, nu trece prin drizzle-kit) —
-- aplicate live la 2026-10-02 (migrarea `storage_scope_org_branding_by_membership`).
--
-- Înainte: orice utilizator autentificat putea insera/suprascrie (org-branding)
-- și insera/suprascrie/ȘTERGE (campanii) în bucket-urile PUBLICE, fără scopare pe
-- organizație — un cont gratuit putea schimba logo-ul sau coperta oricărui ONG.
-- Acum: scrierea în `org-branding` doar în folderul organizației din care
-- utilizatorul (după emailul din JWT) e membru. Toate încărcările din aplicație
-- se fac server-side, cu sesiunea utilizatorului și upsert:false (deci nu e nevoie
-- de UPDATE/DELETE). Citirea rămâne publică (URL-urile din pagini și emailuri).
--
-- Căi acceptate: <orgSlug>/...  și  newsletter/<orgId>/...
--
-- ⚠️ Nu rula scripts/setup-storage-financiar.mjs în forma actuală: ar da
-- select/insert/update/delete oricărui `authenticated` pe un bucket privat cu
-- balanțe. Folosește o politică bazată pe app_private.storage_membru_org.

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

drop policy if exists org_branding_authenticated_upload on storage.objects;
drop policy if exists org_branding_authenticated_update on storage.objects;
create policy org_branding_member_upload on storage.objects
  for insert to authenticated
  with check (bucket_id = 'org-branding' and app_private.storage_membru_org(name));

update storage.buckets set allowed_mime_types = array['image/png','image/jpeg','image/webp'] where id = 'org-branding';

-- campanii: neutilizat de cod; rămâne doar citirea publică (campanii_public_read).
drop policy if exists campanii_authenticated_upload on storage.objects;
drop policy if exists campanii_authenticated_update on storage.objects;
drop policy if exists campanii_authenticated_delete on storage.objects;
