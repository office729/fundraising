-- Influenceri: politicile RLS ale rutei publice /r/<cod> (fără sesiune), restrânse la strictul necesar. Idempotent. Se aplică cu scripts/aplica-influenceri-rls-v2.mjs.
--
-- PROBLEMA (documentation/influenceri.sql, prima variantă):
--  * influenceri_linkuri_public_lookup (select) nu avea nicio restricție de rând: orice cod care seta app.public_lookup = 'true' putea citi TOATE linkurile din TOATE organizațiile
--    (cod, campanie, platformă, descriere);
--  * influenceri_clicuri_public_lookup era „for all” (inclusiv delete/update pe orice rând), tot fără restricție de rând.
--
-- REGULA NOUĂ: ruta setează, pe lângă app.public_lookup (folosit doar pentru organizație și pagina campaniei din același select), GUC-ul app.link_slug = codul din adresă.
--  * linkurile: select doar pe rândul cu slug = app.link_slug (fără GUC sau cu alt cod nu se vede nimic);
--  * clicurile: select / insert / update doar pentru linkul cu acel slug (verificat printr-un exists pe influenceri_linkuri, în aceeași organizație); fără delete.
--    „insert … on conflict do update” (numărătoarea zilnică) cere politici de select + insert + update.
-- Izolarea pe organizație (utilizatori autentificați) rămâne neschimbată: *_tenant_isolation din influenceri.sql.
--
-- ORDINEA DE PUBLICARE: întâi codul (ruta setează app.link_slug; cât timp politicile vechi sunt active, GUC-ul în plus nu strică nimic), apoi acest script.
-- Dacă scriptul rulează înaintea codului nou, linkurile /r/<cod> dau 404 până la publicare (ruta nu setează încă app.link_slug).
--
-- Notă: pe Supavisor un GUC nesetat întoarce șir gol (nu NULL), de aceea nullif(...) peste tot (la fel ca în restore-rls.mjs).

drop policy if exists influenceri_linkuri_public_lookup on influenceri_linkuri;
create policy influenceri_linkuri_public_lookup on influenceri_linkuri for select
  using (slug = nullif(current_setting('app.link_slug', true), ''));

drop policy if exists influenceri_clicuri_public_lookup on influenceri_clicuri;
drop policy if exists influenceri_clicuri_public_select on influenceri_clicuri;
drop policy if exists influenceri_clicuri_public_insert on influenceri_clicuri;
drop policy if exists influenceri_clicuri_public_update on influenceri_clicuri;
create policy influenceri_clicuri_public_select on influenceri_clicuri for select
  using (exists (select 1 from influenceri_linkuri l where l.id = influenceri_clicuri.link_id and l.org_id = influenceri_clicuri.org_id and l.slug = nullif(current_setting('app.link_slug', true), '')));
create policy influenceri_clicuri_public_insert on influenceri_clicuri for insert
  with check (exists (select 1 from influenceri_linkuri l where l.id = influenceri_clicuri.link_id and l.org_id = influenceri_clicuri.org_id and l.slug = nullif(current_setting('app.link_slug', true), '')));
create policy influenceri_clicuri_public_update on influenceri_clicuri for update
  using (exists (select 1 from influenceri_linkuri l where l.id = influenceri_clicuri.link_id and l.org_id = influenceri_clicuri.org_id and l.slug = nullif(current_setting('app.link_slug', true), '')))
  with check (exists (select 1 from influenceri_linkuri l where l.id = influenceri_clicuri.link_id and l.org_id = influenceri_clicuri.org_id and l.slug = nullif(current_setting('app.link_slug', true), '')));
