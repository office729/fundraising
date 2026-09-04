/* `drizzle-kit push` DROPUIE toate politicile RLS create manual (CASCADE),
 * la FIECARE rulare — nu doar când schema se schimbă (drizzle-kit nu le
 * urmărește ca parte din schemă). Rulează acest script imediat după orice
 * `npm run db:push`, altfel aplicația rămâne blocată (FORCE ROW LEVEL
 * SECURITY + zero politici = deny-all pe toate tabelele).
 *
 * ⚠️ Toate expresiile de mai jos folosesc `nullif(current_setting(...), '')`
 * în loc de `current_setting(...)` simplu, înainte de orice `::uuid` sau
 * `is not null`. Motiv confirmat direct: prin Supavisor (pooler-ul folosit
 * pentru IPv4, vezi MIGRATOR_DATABASE_URL/DATABASE_URL), un GUC custom
 * nesetat întoarce STRING GOL (''), NU NULL ca pe o conexiune directă.
 * Fără `nullif`: `''::uuid` aruncă eroare (nu doar „0 rânduri"), iar
 * `'' is not null` e ADEVĂRAT — politica `organizations_insert_authenticated`
 * ar fi fost permisivă mereu, indiferent dacă user_id chiar era setat.
 *
 * Sursa politicilor: documentation/rls-setup.sql (secțiunile 3-4). Dacă
 * adaugi un tabel nou de tenant, adaugă politica lui și AICI, în ordine.
 *
 * ⚠️ Politicile `*_webhook_*` (fundraising_pages/fundraising_donations/
 * donatori_reali) sunt gated DOAR de GUC-ul global `app.public_lookup`,
 * fără nicio restricție suplimentară pe rândul vizat — cât timp acel GUC e
 * `true` pe tranzacția curentă, politica deschide operația respectivă pe TOT
 * tabelul, nu doar pe rândul pe care-l țintește codul. Scoparea reală vine
 * DOAR din faptul că fiecare query care rulează într-o asemenea tranzacție
 * are propriul `.where()`/`.set()` precis. Orice query NOU adăugat într-o
 * tranzacție cu `app.public_lookup = 'true'` (webhook Stripe, sau lookup-ul
 * de organizație din creeaza/doneaza actions) TREBUIE să aibă propriul
 * predicat explicit de id/org_id — RLS nu-l oferă aici.
 *
 * Folosește MIGRATOR_DATABASE_URL din .env.local — rulează cu:
 *   node --env-file=.env.local scripts/restore-rls.mjs
 */
import postgres from "postgres";

const url = process.env.MIGRATOR_DATABASE_URL;
if (!url) {
  console.error("MIGRATOR_DATABASE_URL lipsește din mediu.");
  process.exit(1);
}

const sql = postgres(url, { connect_timeout: 8 });

const POLICIES = [
  `create policy app_users_visible on app_users for select using (
    email = current_setting('app.current_user_email', true)
    or id = nullif(current_setting('app.current_user_id', true), '')::uuid
    or id in (
      select m2.user_id from memberships m1
      join memberships m2 on m2.org_id = m1.org_id
      where m1.user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
    )
  )`,
  `create policy app_users_insert_self on app_users for insert with check (true)`,
  `create policy memberships_self on memberships for select using (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid)`,
  `create policy memberships_insert_self on memberships for insert with check (user_id = nullif(current_setting('app.current_user_id', true), '')::uuid)`,
  `create policy organizations_member on organizations for select using (
    id in (select org_id from memberships where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid)
  )`,
  `create policy organizations_insert_authenticated on organizations for insert with check (nullif(current_setting('app.current_user_id', true), '') is not null)`,
  `create policy organizations_update_admin on organizations for update using (
    id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  )`,
  // Lookup public de organizație DUPĂ SLUG — folosit de orice rută publică
  // ce trebuie să rezolve org_id înainte de un INSERT (Formularul 230,
  // paginile de strângere fonduri) sau de webhook-ul Stripe (actualizări de
  // stare, tot server-side/trusted). Slug-ul e oricum public (apare în orice
  // URL din CRM) — nu e o scurgere de date noi; codul care folosește politica
  // asta selectează DOAR coloana `id`.
  `create policy organizations_public_lookup on organizations for select using (
    nullif(current_setting('app.public_lookup', true), '') = 'true'
  )`,
  `create policy companies_tenant_isolation on companies
    using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
    with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)`,
  `create policy contacts_tenant_isolation on contacts
    using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
    with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)`,
  `create policy crm_kv_tenant_isolation on crm_kv
    using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
    with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)`,
  // company_sponsorizari / company_notite — modulul CRM Companii (Calm Impact),
  // orgId denormalizat direct pe rând (ca la contacts) — izolare simplă.
  `create policy company_sponsorizari_tenant_isolation on company_sponsorizari
    using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
    with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)`,
  `create policy company_notite_tenant_isolation on company_notite
    using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
    with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)`,
  // apeluri: membrii organizației văd doar apelurile proprii (SELECT normal).
  // Scrierea (creare la inițiere, actualizare status/durată la finalizare) o
  // fac DOAR webhook-urile Twilio (context server, de încredere — validare
  // prin semnătura Twilio în cod, nu prin sesiune de utilizator), la fel ca
  // webhook-ul Stripe — gated de același GUC app.public_lookup.
  `create policy apeluri_tenant_isolation on apeluri for select using (
    org_id = nullif(current_setting('app.current_org_id', true), '')::uuid
  )`,
  `create policy apeluri_webhook_insert on apeluri for insert with check (
    nullif(current_setting('app.public_lookup', true), '') = 'true'
  )`,
  `create policy apeluri_webhook_update on apeluri for update using (
    nullif(current_setting('app.public_lookup', true), '') = 'true'
  )`,
  // invites: vizibile fie de admin/owner-ul organizației (listă), fie de
  // cine deține token-ul din link (acceptare) — vezi app.invite_lookup_token
  // în src/app/invite/[token]/actions.ts.
  `create policy invites_org_admin_select on invites for select using (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  )`,
  `create policy invites_token_select on invites for select using (
    token = nullif(current_setting('app.invite_lookup_token', true), '')
  )`,
  `create policy invites_org_admin_insert on invites for insert with check (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  )`,
  `create policy invites_token_update on invites for update using (
    token = nullif(current_setting('app.invite_lookup_token', true), '')
  )`,
  // formular230_submissions: SELECT doar pentru membrii organizației (statistica
  // din CRM); INSERT public — cine completează link-ul distribuit nu e
  // autentificat și nu poate trece de politica de mai sus, deci trebuie o
  // politică separată, FOR INSERT. org_id vine din server (rezolvat prin
  // organizations_public_lookup mai sus, NU dintr-o valoare trimisă de client),
  // deci `with check (true)` e sigur aici — la fel ca `app_users_insert_self`.
  `create policy formular230_tenant_isolation on formular230_submissions for select using (
    org_id = nullif(current_setting('app.current_org_id', true), '')::uuid
  )`,
  `create policy formular230_public_insert on formular230_submissions for insert with check (true)`,
  // Ștergerea (ex. un răspuns dublu/test) e permisă oricărui membru — la fel
  // ca SELECT-ul de mai sus, nu doar admin/owner — pentru că acțiunea din
  // cod (stergeFormular230) foloseşte withOrgSession, nu withOrgAdmin.
  `create policy formular230_member_delete on formular230_submissions for delete using (
    org_id = nullif(current_setting('app.current_org_id', true), '')::uuid
  )`,

  // formular230_beneficiari: SELECT pentru orice membru (la fel ca răspunsurile
  // în sine); scris (adăugare/editare/ștergere cont, upload șablon PDF) doar
  // admin/owner — sunt datele bancare ale organizației. Lookup public separat,
  // pentru formularul public + POST-ul de trimitere, care rezolvă beneficiarul
  // din slug fără sesiune (app.public_lookup, ca la organizations).
  `create policy formular230_beneficiari_tenant_isolation on formular230_beneficiari for select using (
    org_id = nullif(current_setting('app.current_org_id', true), '')::uuid
  )`,
  `create policy formular230_beneficiari_admin_insert on formular230_beneficiari for insert with check (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  )`,
  `create policy formular230_beneficiari_admin_update on formular230_beneficiari for update using (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  )`,
  `create policy formular230_beneficiari_admin_delete on formular230_beneficiari for delete using (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  )`,
  `create policy formular230_beneficiari_public_lookup on formular230_beneficiari for select using (
    nullif(current_setting('app.public_lookup', true), '') = 'true'
  )`,

  // formular230_campanii_email: evidența trimiterilor campaniei de reamintire
  // (cel mult una per organizație per an — unique(org_id, an), verificat de
  // cron ÎNAINTE să trimită, ca să nu dubleze). SELECT pentru orice membru
  // (statusul „trimis pe X" din panou); INSERT admin/owner (trimitere manuală)
  // SAU contextul de încredere al cron-ului (app.public_lookup, ca la
  // webhook-urile Stripe/Twilio — cron-ul nu are sesiune de user).
  `create policy formular230_campanii_email_tenant_isolation on formular230_campanii_email for select using (
    org_id = nullif(current_setting('app.current_org_id', true), '')::uuid
  )`,
  `create policy formular230_campanii_email_admin_insert on formular230_campanii_email for insert with check (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  )`,
  `create policy formular230_campanii_email_cron_insert on formular230_campanii_email for insert with check (
    nullif(current_setting('app.public_lookup', true), '') = 'true'
  )`,

  // fundraising_pages: conținutul paginii (titlu/poveste/țintă/suma strânsă)
  // e vizibil public INDIFERENT de status — nu e date sensibile, iar o
  // campanie închisă trebuie să rămână arhivată/vizibilă (pagina publică
  // afișează un banner "închisă" în loc de formular, nu dispare). Gating-ul
  // real e în cod: doneazaAction respinge donații pe o pagină status !=
  // 'activa'. Membrii organizației văd TOATE paginile lor prin a doua
  // politică. Creare = publică (susținătorul nu e autentificat); actualizarea
  // sumei strânse o face DOAR webhook-ul Stripe.
  `create policy fundraising_pages_public_select on fundraising_pages for select using (true)`,
  `create policy fundraising_pages_tenant_isolation on fundraising_pages for select using (
    org_id = nullif(current_setting('app.current_org_id', true), '')::uuid
  )`,
  // Restrâns la statusul inițial așteptat (niciun cod nu inserează vreodată
  // altă valoare) — RLS impune invariantul la nivel de bază de date, nu doar
  // prin convenția "codul nu trimite niciodată alt status".
  `create policy fundraising_pages_public_insert on fundraising_pages for insert with check (status = 'activa')`,
  `create policy fundraising_pages_webhook_update on fundraising_pages for update using (
    nullif(current_setting('app.public_lookup', true), '') = 'true'
  )`,
  `create policy fundraising_pages_admin_delete on fundraising_pages for delete using (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  )`,
  // fundraising_donations: nu au o politică publică de SELECT — un vizitator
  // nu are niciun motiv legitim să citească donații individuale (nume/email/
  // sumă), doar să insereze una nouă (înainte de a fi trimis spre Stripe) și
  // apoi webhook-ul s-o confirme. CRM-ul organizației le vede pe toate.
  `create policy fundraising_donations_tenant_isolation on fundraising_donations for select using (
    org_id = nullif(current_setting('app.current_org_id', true), '')::uuid
  )`,
  // Donații confirmate ("reusita") — vizibile public pe pagina campaniei
  // (donații recente + top donatori). Codul care citește prin politica asta
  // NU selectează niciodată email_donator — controlul e la nivel de coloană
  // în interogare, nu doar la nivel de rând (RLS nu ascunde coloane).
  `create policy fundraising_donations_public_select on fundraising_donations for select using (
    status = 'reusita'
  )`,
  // Restrâns la statusul inițial așteptat — doneazaAction nu inserează
  // niciodată altă valoare. Reînnoirile lunare (invoice.paid) NU trec prin
  // această politică — ele inserează direct status='reusita', printr-o
  // politică separată, gated de contextul de încredere al webhook-ului.
  `create policy fundraising_donations_public_insert on fundraising_donations for insert with check (
    status = 'in_asteptare'
  )`,
  `create policy fundraising_donations_webhook_insert on fundraising_donations for insert with check (
    nullif(current_setting('app.public_lookup', true), '') = 'true'
  )`,
  `create policy fundraising_donations_webhook_select on fundraising_donations for select using (
    nullif(current_setting('app.public_lookup', true), '') = 'true'
  )`,
  `create policy fundraising_donations_webhook_update on fundraising_donations for update using (
    nullif(current_setting('app.public_lookup', true), '') = 'true'
  )`,

  // donatori_reali: doar organizația își vede propriii donatori reali;
  // scris DOAR de webhook-ul Stripe (upsert după org_id+email).
  `create policy donatori_reali_tenant_isolation on donatori_reali for select using (
    org_id = nullif(current_setting('app.current_org_id', true), '')::uuid
  )`,
  `create policy donatori_reali_webhook_insert on donatori_reali for insert with check (
    nullif(current_setting('app.public_lookup', true), '') = 'true'
  )`,
  `create policy donatori_reali_webhook_update on donatori_reali for update using (
    nullif(current_setting('app.public_lookup', true), '') = 'true'
  )`,

  // fundraising_updates: text public (nu e sensibil, e menit distribuirii),
  // scris DOAR de owner/admin din CRM.
  `create policy fundraising_updates_public_select on fundraising_updates for select using (true)`,
  `create policy fundraising_updates_admin_insert on fundraising_updates for insert with check (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  )`,
  `create policy fundraising_updates_admin_delete on fundraising_updates for delete using (
    org_id in (
      select org_id from memberships
      where user_id = nullif(current_setting('app.current_user_id', true), '')::uuid
        and role in ('owner', 'admin')
    )
  )`,
];

const FORCE_TABLES = [
  "organizations",
  "memberships",
  "app_users",
  "companies",
  "contacts",
  "crm_kv",
  "company_sponsorizari",
  "company_notite",
  "apeluri",
  "invites",
  "formular230_submissions",
  "formular230_beneficiari",
  "formular230_campanii_email",
  "fundraising_pages",
  "fundraising_donations",
  "donatori_reali",
  "fundraising_updates",
];

try {
  for (const t of FORCE_TABLES) {
    await sql.unsafe(`alter table ${t} force row level security`);
  }
  let created = 0;
  for (const stmt of POLICIES) {
    try {
      await sql.unsafe(stmt);
      created++;
    } catch (e) {
      if (!/already exists/i.test(e.message)) throw e;
    }
  }
  const [{ count }] = await sql`select count(*)::int from pg_policies where schemaname = 'public'`;
  console.log(`RLS OK — ${created} politici (re)create, ${count} politici active în total.`);
} finally {
  await sql.end();
}
