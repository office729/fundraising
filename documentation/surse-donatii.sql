-- „Sursele donațiilor”: copia atribuirii făcută pe donație în clipa în care începe plata (nu se rescrie ulterior). Aditiv și idempotent;
-- aplicat cu scripts/aplica-surse-donatii.mjs (rol migrator).
--
-- Un rând = o donație cu cel puțin o sursă EXTERNĂ identificată (donațiile Direct nu au rând și nu apar în raport):
--   p_* = prima sursă externă, u_* = ultima sursă externă înainte de plată (cea la care se atribuie donația), fiecare cu propriile metadate
--   (categorie, parametri UTM, tipurile de identificatori de click prezente, domeniul referrerului, afiliat, momentul identificării).
--   campanie = utm_campaign ORIGINAL al sursei (gol dacă sursa nu a avut utm_campaign; nu se moștenește de la sursa precedentă).
-- Banii: suma originală (cenți și moneda), echivalentul în lei de pe donație, cursul EUR/RON folosit și valoarea în EUR (cenți) calculată O SINGURĂ DATĂ, la început de plată:
--   donațiile vechi nu se recalculează la cursul zilei. suma_eur_cenți null = conversie indisponibilă (raportul le semnalează, nu le numără ca 0).
-- „Plătită” NU se salvează aici: raportul unește rândul cu donația și ia doar fundraising_donations.status = 'reusita' (confirmarea vine tot din webhook-ul existent).
-- Neschimbabil: aplicația are doar select și insert (fără update/delete); o retrimitere a aceleiași plăți nu creează al doilea rând (unic pe donație).
create table if not exists donatie_surse (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  donation_id uuid not null references fundraising_donations(id) on delete cascade,
  captat_la timestamptz not null default now(),
  persistent boolean not null default false,
  reguli_versiune text not null default 'v1',

  p_categorie text,
  p_utm_source text,
  p_utm_medium text,
  p_campanie text,
  p_utm_content text,
  p_utm_term text,
  p_click_ids text,
  p_referrer_host text,
  p_referral_id text,
  p_la timestamptz,

  u_categorie text not null,
  u_utm_source text,
  u_utm_medium text,
  u_campanie text,
  u_utm_content text,
  u_utm_term text,
  u_click_ids text,
  u_referrer_host text,
  u_referral_id text,
  u_la timestamptz not null,

  suma_originala_bani integer,
  moneda text,
  suma_lei integer,
  curs_eur_ron numeric(12, 6),
  suma_eur_centi integer,
  conversie_baza text not null default 'indisponibila',
  curs_la timestamptz,
  unique (donation_id)
);

do $$ begin
  alter table donatie_surse add constraint donatie_surse_u_categorie_chk
    check (u_categorie in ('facebook_ads','facebook_organic','google_ads','linkedin_ads','linkedin_organic','newsletter','organic_search','tiktok_ads','tiktok_organic','youtube_ads','youtube_organic','alte_retele','alt_site','afiliat'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table donatie_surse add constraint donatie_surse_p_categorie_chk
    check (p_categorie is null or p_categorie in ('facebook_ads','facebook_organic','google_ads','linkedin_ads','linkedin_organic','newsletter','organic_search','tiktok_ads','tiktok_organic','youtube_ads','youtube_organic','alte_retele','alt_site','afiliat'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table donatie_surse add constraint donatie_surse_conversie_chk check (conversie_baza in ('eur','ron','echivalent_lei','indisponibila'));
exception when duplicate_object then null; end $$;

-- Extindere (TikTok și YouTube ca surse separate): constrângerile de mai sus sunt create doar la prima rulare, deci aici le înlocuim cu lista nouă. Idempotent.
alter table donatie_surse drop constraint if exists donatie_surse_u_categorie_chk;
alter table donatie_surse add constraint donatie_surse_u_categorie_chk
  check (u_categorie in ('facebook_ads','facebook_organic','google_ads','linkedin_ads','linkedin_organic','newsletter','organic_search','tiktok_ads','tiktok_organic','youtube_ads','youtube_organic','alte_retele','alt_site','afiliat'));
alter table donatie_surse drop constraint if exists donatie_surse_p_categorie_chk;
alter table donatie_surse add constraint donatie_surse_p_categorie_chk
  check (p_categorie is null or p_categorie in ('facebook_ads','facebook_organic','google_ads','linkedin_ads','linkedin_organic','newsletter','organic_search','tiktok_ads','tiktok_organic','youtube_ads','youtube_organic','alte_retele','alt_site','afiliat'));

create index if not exists donatie_surse_org_captat_idx on donatie_surse (org_id, captat_la desc);
create index if not exists donatie_surse_org_categorie_idx on donatie_surse (org_id, u_categorie);

grant select, insert on donatie_surse to app_user;
-- Privilegiile implicite ale schemei dau și update/delete: le retragem explicit, ca rândurile să rămână neschimbabile (ștergerea la ștergerea donației/organizației se face prin cascadă).
revoke update, delete, truncate on donatie_surse from app_user;

-- Izolare pe organizație (RLS forțat): rândul se scrie în contextul organizației donației (app.current_org_id), la început de plată.
alter table donatie_surse enable row level security;
alter table donatie_surse force row level security;
drop policy if exists donatie_surse_tenant_isolation on donatie_surse;
create policy donatie_surse_tenant_isolation on donatie_surse
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
