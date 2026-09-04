-- ============================================================================
-- Fundraising Academy — configurare izolare de tenant (Row Level Security)
-- ============================================================================
-- Rulează manual în Supabase SQL Editor, o singură dată per proiect
-- (staging și producție sunt proiecte Supabase SEPARATE — rulează în ambele).
-- NU rula asta prin drizzle-kit — crearea de roluri e operațiune la nivel de
-- instanță Postgres, nu face parte din schema aplicației.
--
-- ⚠️⚠️ CAPCANA #1 (Faza 2, lockout real): `drizzle-kit push` NU cunoaște
-- politicile CREATE POLICY create manual — le DROPUIE PE TOATE (CASCADE) la
-- FIECARE rulare, chiar și când schema nu se schimbă deloc — fără avertisment
-- vizibil ca atare (apare doar ca „DROP POLICY ... CASCADE" pierdut printre
-- restul liniilor). FORCE ROW LEVEL SECURITY rămâne activ → rezultatul e un
-- lockout total (deny-all), nu o gaură de securitate — dar aplicația pică
-- integral până se restaurează politicile.
-- REZOLVAT: `npm run db:push` rulează acum automat `scripts/restore-rls.mjs`
-- după `drizzle-kit push` (vezi package.json). Dacă rulezi `drizzle-kit push`
-- direct (nu prin npm script), rulează manual după `npm run db:restore-rls`.
--
-- ⚠️⚠️ CAPCANA #2 (Faza 2, confirmată live pe Vercel): conexiunea DIRECTĂ
-- (`db.<ref>.supabase.co:5432`) e IPv6-only — Vercel Functions NU pot rezolva
-- acel hostname (`getaddrinfo ENOTFOUND`). Producția TREBUIE să folosească
-- Supavisor (pooler-ul Supabase, IPv4) — vezi DATABASE_URL/MIGRATOR_DATABASE_URL
-- mai jos, format `<rol>.<project-ref>@aws-<shard>-<regiune>.pooler.supabase.com`.
-- Shard-ul (`aws-0-`/`aws-1-`/...) NU e ghicibil din regiune — ia-l din
-- Project Settings → Database → Connection pooling, sau din Management API
-- (`GET /v1/projects/{ref}/config/database/pooler`). Un shard greșit dă o
-- eroare Supavisor („tenant/user not found") ușor de confundat cu „rolul nu
-- e suportat de pooler" — NU e cazul, roluri custom (app_user/migrator, nu
-- doar postgres) funcționează normal prin pooler odată cu shard-ul corect.
--
-- ⚠️⚠️ CAPCANA #3 (cea mai subtilă, găsită direct prin test — vezi secțiunea 3):
-- prin Supavisor, un GUC custom (`app.current_user_id` etc.) NICIODATĂ setat
-- întoarce STRING GOL (''), NU NULL ca pe o conexiune directă. Efect dublu:
--   (a) `current_setting(...)::uuid` ARUNCĂ EROARE („invalid input syntax for
--       type uuid") în loc să dea NULL — un cast simplu, netestat cu pooler-ul,
--       pică la primul request fără context.
--   (b) `current_setting(...) is not null` e ADEVĂRAT chiar și nesetat — o
--       politică scrisă așa (cum era `organizations_insert_authenticated`
--       inițial) e permisivă mereu, indiferent dacă user_id chiar există.
-- SOLUȚIE, aplicată peste tot mai jos: `nullif(current_setting(...), '')` în
-- loc de `current_setting(...)` simplu, înainte de orice `::uuid` sau
-- `is not null`. Verifică mereu împotriva pooler-ului (nu doar conexiune
-- directă) înainte de a considera o politică nouă „gata".
--
-- ⚠️ CAPCANA #4: politicile `*_webhook_*` (fundraising_pages/fundraising_
-- donations/donatori_reali) sunt gated DOAR de GUC-ul global
-- `app.public_lookup`, fără nicio restricție suplimentară pe rândul vizat —
-- cât timp acel GUC e `true` pe tranzacția curentă, politica deschide
-- operația respectivă pe TOT tabelul, nu doar pe rândul pe care-l țintește
-- codul. Scoparea reală vine DOAR din faptul că fiecare query care rulează
-- într-o asemenea tranzacție are propriul `.where()`/`.set()` precis. Orice
-- query NOU adăugat într-o tranzacție cu `app.public_lookup = 'true'`
-- (webhook Stripe, sau lookup-ul de organizație din creeaza/doneaza actions)
-- TREBUIE să aibă propriul predicat explicit de id/org_id — RLS nu-l oferă
-- aici.
--
-- Model: DOUĂ roluri Postgres.
--   migrator  — owner-ul schemei, folosit DOAR de CI/CD la `drizzle-kit push`/
--               `migrate`. Parola lui NU ajunge niciodată în variabilele de
--               mediu ale aplicației Next.js (doar în cele de deploy/migrare).
--   app_user  — rolul de runtime al aplicației (DATABASE_URL). NOBYPASSRLS,
--               NU e owner de schemă — chiar dacă ar deveni owner accidental
--               cândva, FORCE ROW LEVEL SECURITY tot aplică politicile.
-- ============================================================================

-- 1. Rolurile (parole generate pentru proiectul office729/Fundraising Academy —
--    dacă rulezi asta pe un proiect nou, înlocuiește-le cu altele generate).
create role migrator login password 'JTl4xNr4PXpZIioW9ZRBb_i6EkgyJwfG' createdb;
create role app_user login password 'FKQt7LWHq13hYI_agadT0hxwp6NFK8he' nobypassrls;

grant all on schema public to migrator;
alter schema public owner to migrator;

grant usage on schema public to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant usage, select on all sequences in schema public to app_user;

-- Orice tabel nou creat ulterior de `migrator` (via migrații) capătă automat
-- aceleași drepturi pentru app_user — fără asta, fiecare migrare ar cere un
-- GRANT manual suplimentar.
alter default privileges for role migrator in schema public
  grant select, insert, update, delete on tables to app_user;
alter default privileges for role migrator in schema public
  grant usage, select on sequences to app_user;

-- 2. FORCE ROW LEVEL SECURITY pe tabelele de platformă.
--    Drizzle `.enableRLS()` face doar ENABLE — rulează asta separat, o dată,
--    și repet-o pentru orice tabel nou de tenant din fazele următoare (CRM PJ,
--    CRM PF, tool-kv etc.): vezi șablonul de la finalul fișierului.
alter table organizations force row level security;
alter table memberships   force row level security;
alter table app_users     force row level security;

-- ============================================================================
-- 3. Politici — bootstrapping în 3 pași per request, vezi src/lib/auth/guard.ts:
--    (a) set_config('app.current_user_email', <email verificat de Supabase>, true)
--    (b) ensureAppUser() găsește/creează rândul, apoi
--        set_config('app.current_user_id', <app_users.id>, true)
--    (c) set_config('app.current_org_id', <organizations.id>, true)
--    Toate ca `set_config(..., true)` — scop de TRANZACȚIE (echivalent SET LOCAL),
--    deci contextul nu „scapă" între cereri pe aceeași conexiune din pool.
--    Toate comparațiile de mai jos folosesc `nullif(current_setting(...), '')`
--    — vezi CAPCANA #3 de la începutul fișierului.
-- ============================================================================

-- app_users: propriul rând (după email, înainte să existe id) + rândul
-- coechipierilor din orice organizație comună (necesar pt. Setări → Echipă).
create policy app_users_visible ON app_users
  for select using (
    email = current_setting('app.current_user_email', true)
    or id = nullif(current_setting('app.current_user_id', true), '')::uuid
    or id in (
      select m2.user_id from memberships m1
      join memberships m2 on m2.org_id = m1.org_id
      where m1.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
    )
  );

-- Inserare: se întâmplă o singură dată per email, la primul login (ensureAppUser
-- face mai întâi un SELECT — vezi politica de mai sus — și doar dacă nu găsește
-- nimic face acest INSERT). id-ul e generat chiar în acest query, deci nu poate
-- fi comparat cu current_user_id ÎNAINTE să existe; unicitatea pe `email` e
-- garanția reală împotriva duplicării, nu politica RLS.
create policy app_users_insert_self ON app_users
  for insert with check (true);

-- memberships: doar propriile membership-uri.
create policy memberships_self ON memberships
  for select using (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid);

-- Inserare: doar când te adaugi PE TINE ca membru — creare organizație nouă
-- (te adaugi ca owner). Invitarea altor useri e Faza 1, cu flux de token separat
-- (acolo politica se extinde cu o excepție pentru owner/admin care inserează
-- pe altcineva, validată suplimentar în server action, nu doar în SQL).
create policy memberships_insert_self ON memberships
  for insert with check (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid);

-- organizations: doar organizațiile din care faci parte.
create policy organizations_member ON organizations
  for select using (
    id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
    )
  );

-- Oricine autentificat (are un user_id de context) poate crea o organizație
-- nouă — asta e literalmente fluxul de signup.
create policy organizations_insert_authenticated ON organizations
  for insert with check (nullif(current_setting('app.current_user_id', true), '') is not null);

-- Lookup public de organizație după slug — folosit de orice rută publică ce
-- rezolvă org_id înainte de un insert (Formularul 230, paginile de strângere
-- fonduri) sau de webhook-ul Stripe pentru acele funcționalități (vezi
-- secțiunea 4). Slug-ul e oricum public (apare în orice URL din CRM);
-- codul care se bazează pe politica asta selectează DOAR coloana `id`.
create policy organizations_public_lookup ON organizations
  for select using (nullif(current_setting('app.public_lookup', true), '') = 'true');

-- Update (schimbare pachet, stripe_customer_id etc.): owner/admin din acea
-- organizație, SAU webhook-ul Stripe (care rulează cu propriul context —
-- vezi nota din guard.ts / Faza 1 despre `withStripeWebhook`).
create policy organizations_update_admin ON organizations
  for update using (
    id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  );

-- invites: două căi de acces separate, pe același tabel —
--  (a) admin/owner vede/creează invitațiile PROPRIEI organizații (listă);
--  (b) cine deține token-ul din link vede/actualizează DOAR acel rând —
--      necesar pt. cel invitat, care nu e încă membru (deci nu trece de (a)).
--      Vezi app.invite_lookup_token în src/app/invite/[token]/actions.ts.
alter table invites force row level security;
create policy invites_org_admin_select ON invites
  for select using (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  );
create policy invites_token_select ON invites
  for select using (token = nullif(current_setting('app.invite_lookup_token', true), ''));
create policy invites_org_admin_insert ON invites
  for insert with check (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  );
create policy invites_token_update ON invites
  for update using (token = nullif(current_setting('app.invite_lookup_token', true), ''));

-- ============================================================================
-- 4. Tabele de TENANT — toate au o coloană org_id, fără excepție. Șablonul
--    de mai jos (comentat) e pentru instrumente viitoare; CRM PJ (Faza 2) e
--    deja aplicat mai jos, cu numele reale de tabele.
-- ============================================================================
-- alter table <tabel> force row level security;
-- create policy <tabel>_tenant_isolation on <tabel>
--   using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
--   with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);

-- CRM PJ (companies / contacts / crm_kv) — Faza 2.
alter table companies force row level security;
alter table contacts   force row level security;
alter table crm_kv     force row level security;

create policy companies_tenant_isolation on companies
  using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
create policy contacts_tenant_isolation on contacts
  using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
create policy crm_kv_tenant_isolation on crm_kv
  using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);

-- Modulul CRM Companii (Calm Impact, real — src/app/(app)/[orgSlug]/crm/companii):
-- sponsorizări cu dată (sursa de adevăr pentru statisticile pe perioadă) și
-- notițe reale, ambele cu org_id denormalizat direct pe rând, ca la contacts.
alter table company_sponsorizari force row level security;
alter table company_notite       force row level security;

create policy company_sponsorizari_tenant_isolation on company_sponsorizari
  using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
create policy company_notite_tenant_isolation on company_notite
  using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);

-- Jurnal real de apeluri (Twilio Voice) — membrii organizației văd doar
-- apelurile proprii; scrierea (creare + status/durată) o fac DOAR
-- webhook-urile Twilio (context server, validat prin semnătura Twilio în
-- cod), gated de același app.public_lookup ca webhook-ul Stripe.
alter table apeluri force row level security;
create policy apeluri_tenant_isolation on apeluri
  for select using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
create policy apeluri_webhook_insert on apeluri
  for insert with check (nullif(current_setting('app.public_lookup', true), '') = 'true');
create policy apeluri_webhook_update on apeluri
  for update using (nullif(current_setting('app.public_lookup', true), '') = 'true');

-- Formularul 230 (Faza 3) — SELECT doar membri (statistica din CRM); INSERT
-- public, cine completează link-ul distribuit nu e autentificat, deci separat,
-- FOR INSERT. org_id vine din server (organizations_public_lookup de mai sus),
-- NU dintr-o valoare trimisă de client — `with check (true)` e sigur aici,
-- la fel ca `app_users_insert_self`.
alter table formular230_submissions force row level security;
create policy formular230_tenant_isolation on formular230_submissions
  for select using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
create policy formular230_public_insert on formular230_submissions
  for insert with check (true);
-- Ștergerea (ex. un răspuns dublu/test) e permisă oricărui membru — la fel ca
-- SELECT-ul de mai sus, nu doar admin/owner — pentru că stergeFormular230
-- foloseşte withOrgSession, nu withOrgAdmin.
create policy formular230_member_delete on formular230_submissions
  for delete using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);

-- formular230_beneficiari (conturi/subconturi pentru Formularul 230, Faza 4)
-- — SELECT pentru orice membru; scris (IBAN/CIF/șablon PDF) doar admin/owner.
-- Lookup public separat pentru formularul public + POST-ul de trimitere.
alter table formular230_beneficiari force row level security;
create policy formular230_beneficiari_tenant_isolation on formular230_beneficiari
  for select using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
create policy formular230_beneficiari_admin_insert on formular230_beneficiari
  for insert with check (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  );
create policy formular230_beneficiari_admin_update on formular230_beneficiari
  for update using (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  );
create policy formular230_beneficiari_admin_delete on formular230_beneficiari
  for delete using (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  );
create policy formular230_beneficiari_public_lookup on formular230_beneficiari
  for select using (nullif(current_setting('app.public_lookup', true), '') = 'true');

-- formular230_campanii_email: evidența trimiterilor campaniei de reamintire
-- prin email (cel mult una per organizație per an — unique(org_id, an)).
-- SELECT pentru orice membru; INSERT admin/owner (trimitere manuală) SAU
-- contextul de încredere al cron-ului zilnic (app.public_lookup — cron-ul nu
-- are sesiune de user, la fel ca webhook-urile Stripe/Twilio).
alter table formular230_campanii_email force row level security;
create policy formular230_campanii_email_tenant_isolation on formular230_campanii_email
  for select using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
create policy formular230_campanii_email_admin_insert on formular230_campanii_email
  for insert with check (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  );
create policy formular230_campanii_email_cron_insert on formular230_campanii_email
  for insert with check (nullif(current_setting('app.public_lookup', true), '') = 'true');
--
-- ⚠️ CAPCANĂ confirmată în Faza 0 (a produs o eroare reală la primul test):
-- `INSERT ... RETURNING` re-verifică politica de SELECT a tabelului pentru
-- rândul nou-inserat, nu doar WITH CHECK de la INSERT. Dacă vizibilitatea la
-- SELECT depinde de o relație care încă nu există în aceeași tranzacție
-- (ex: organizations_member cere un membership care se creează abia DUPĂ
-- insert-ul organizației), `.returning()` aruncă fals „row-level security
-- policy violation" deși WITH CHECK a trecut. Soluție: generează id-ul în
-- cod (nu .defaultRandom() din DB) și fă INSERT-ul FĂRĂ .returning() ori de
-- câte ori politica de SELECT a tabelului depinde de un rând creat ulterior
-- în aceeași tranzacție. Vezi src/app/(auth)/signup/actions.ts.

-- Pagini de strângere fonduri per-susținător ("peer-to-peer", Faza 4) — creare
-- publică (susținătorul nu e autentificat), conținutul paginii (titlu/poveste/
-- țintă/suma strânsă) vizibil public INDIFERENT de status — nu e informație
-- sensibilă, iar o campanie închisă rămâne arhivată/vizibilă (pagina publică
-- afișează un banner "închisă" în loc de formular, nu dispare — vezi
-- src/app/strangere-fonduri/[orgSlug]/[pageSlug]/page.tsx). Gating-ul real al
-- donațiilor e în cod: doneazaAction respinge orice donație pe o pagină cu
-- status != 'activa'. Membrii organizației văd TOATE paginile lor prin a doua
-- politică. Suma strânsă (cache pe fundraising_pages) e actualizată DOAR de
-- webhook-ul Stripe (checkout.session.completed) — gated de app.public_lookup.
alter table fundraising_pages force row level security;
create policy fundraising_pages_public_select on fundraising_pages
  for select using (true);
create policy fundraising_pages_tenant_isolation on fundraising_pages
  for select using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
-- Restrâns la statusul inițial așteptat (niciun cod nu inserează vreodată
-- altă valoare) — RLS impune invariantul la nivel de bază de date, nu doar
-- prin convenția "codul nu trimite niciodată alt status".
create policy fundraising_pages_public_insert on fundraising_pages
  for insert with check (status = 'activa');
create policy fundraising_pages_webhook_update on fundraising_pages
  for update using (nullif(current_setting('app.public_lookup', true), '') = 'true');
-- Ștergere: doar owner/admin al organizației (ex. pagină spam sau greșită) —
-- vezi src/app/(app)/[orgSlug]/crm/strangere-fonduri/actions.ts.
create policy fundraising_pages_admin_delete on fundraising_pages
  for delete using (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  );

-- Donații: fără politică publică de SELECT — un vizitator nu are niciun motiv
-- legitim să citească donații individuale (nume/email/sumă), doar să insereze
-- una nouă ("in_asteptare", înainte de Stripe Checkout). Webhook-ul o citește
-- și o actualizează ("reusita"/"esuata") prin același GUC de mai sus; CRM-ul
-- organizației le vede pe toate prin politica de tenant isolation.
alter table fundraising_donations force row level security;
create policy fundraising_donations_tenant_isolation on fundraising_donations
  for select using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
-- Donații confirmate ("reusita") vizibile public (donații recente + top
-- donatori pe pagina campaniei). RLS controlează RÂNDURI, nu coloane — codul
-- care se bazează pe această politică nu selectează NICIODATĂ email_donator.
create policy fundraising_donations_public_select on fundraising_donations
  for select using (status = 'reusita');
-- Restrâns la statusul inițial așteptat — doneazaAction nu inserează
-- niciodată altă valoare. Reînnoirile lunare (invoice.paid) NU trec prin
-- această politică — ele inserează direct status='reusita', printr-o
-- politică separată, gated de contextul de încredere al webhook-ului.
create policy fundraising_donations_public_insert on fundraising_donations
  for insert with check (status = 'in_asteptare');
create policy fundraising_donations_webhook_insert on fundraising_donations
  for insert with check (nullif(current_setting('app.public_lookup', true), '') = 'true');
create policy fundraising_donations_webhook_select on fundraising_donations
  for select using (nullif(current_setting('app.public_lookup', true), '') = 'true');
create policy fundraising_donations_webhook_update on fundraising_donations
  for update using (nullif(current_setting('app.public_lookup', true), '') = 'true');

-- Donatori REALI (nu prototipul mock din modulul CRM „Calm Impact") — un rând
-- per persoană care a donat efectiv prin Stripe, upsert după org_id+email la
-- fiecare donație confirmată. Doar organizația își vede donatorii proprii;
-- scris DOAR de webhook-ul Stripe (același GUC de mai sus).
alter table donatori_reali force row level security;
create policy donatori_reali_tenant_isolation on donatori_reali
  for select using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
create policy donatori_reali_webhook_insert on donatori_reali
  for insert with check (nullif(current_setting('app.public_lookup', true), '') = 'true');
create policy donatori_reali_webhook_update on donatori_reali
  for update using (nullif(current_setting('app.public_lookup', true), '') = 'true');

-- Actualizări de campanie — text public (nu e sensibil), scris DOAR de
-- owner/admin din CRM (nu susținători, nu public).
alter table fundraising_updates force row level security;
create policy fundraising_updates_public_select on fundraising_updates
  for select using (true);
create policy fundraising_updates_admin_insert on fundraising_updates
  for insert with check (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  );
create policy fundraising_updates_admin_delete on fundraising_updates
  for delete using (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  );
-- ============================================================================
-- 5. Verificare de izolare — OBLIGATORIE, și DIN NOU prin pooler (nu doar
--    conexiune directă — vezi CAPCANA #3):
--
--    a) Creează 2 conturi de test → 2 organizații separate (org A, org B),
--       fiecare cu câte un rând de test într-un tabel de tenant.
--    b) Conectează-te la DB CA app_user (nu ca migrator/owner), prin pooler,
--       FĂRĂ să rulezi niciun set_config. Un SELECT pe orice tabel de tenant
--       trebuie să întoarcă 0 rânduri, FĂRĂ eroare (fail-closed).
--    c) Rulează set_config('app.current_org_id', '<id-ul org A>', true) și
--       repetă SELECT-ul: trebuie să vezi DOAR rândurile din org A, niciodată
--       din org B.
--    d) Repetă cu id-ul org B — confirmă simetria.
-- ============================================================================

-- ============================================================================
-- 6. Verificare rapidă post-push — rulează după ORICE `drizzle-kit push`
--    (vezi avertismentul de la începutul fișierului). Numără politicile
--    curente; dacă numărul e mai mic decât cel din acest fișier, s-au
--    pierdut politici — re-rulează secțiunile 3 și 4 complet.
-- ============================================================================
-- select tablename, policyname, cmd from pg_policies where schemaname = 'public' order by tablename;
-- Așteptat: apeluri(3), app_users(2), companies(1), company_notite(1),
--           company_sponsorizari(1), contacts(1), crm_kv(1),
--           donatori_reali(3), formular230_beneficiari(5),
--           formular230_campanii_email(3), formular230_submissions(3),
--           fundraising_donations(6), fundraising_pages(5),
--           fundraising_updates(3), invites(4), memberships(2),
--           organizations(4) = 48 politici.
