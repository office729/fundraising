-- Câmpuri personalizate, API public și webhook-uri. Aditiv și idempotent; aplicat cu scripts/aplica-api-campuri.mjs.
--
-- 1) campuri_personalizate: definițiile câmpurilor adăugate de organizație la donatori sau firme (valorile stau în coloana jsonb „campuri” a donatorului sau firmei).
--    Un câmp nu se șterge, se arhivează (activ = false): valorile deja introduse rămân.
-- 2) api_chei: cheile API ale organizației. Se păstrează doar hash-ul (SHA-256); cheia întreagă se arată o singură dată, la creare. Căutarea după hash (fără sesiune de utilizator)
--    trece prin GUC-ul app.api_cheie_hash: politica de căutare lasă să se vadă doar rândul cu acel hash.
-- 3) webhook_endpointuri / webhook_livrari: adresele către care trimitem evenimente (donație reușită, donator dezabonat) și jurnalul livrărilor (cu reîncercări).
alter table donatori_reali add column if not exists campuri jsonb not null default '{}'::jsonb;
alter table companies add column if not exists campuri jsonb not null default '{}'::jsonb;

create table if not exists campuri_personalizate (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  entitate text not null,
  cheie text not null,
  eticheta text not null,
  tip text not null,
  optiuni jsonb not null default '[]'::jsonb,
  ordine integer not null default 0,
  activ boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists campuri_personalizate_unic on campuri_personalizate (org_id, entitate, cheie);
alter table campuri_personalizate drop constraint if exists campuri_personalizate_entitate_chk;
alter table campuri_personalizate add constraint campuri_personalizate_entitate_chk check (entitate in ('donator', 'companie'));
alter table campuri_personalizate drop constraint if exists campuri_personalizate_tip_chk;
alter table campuri_personalizate add constraint campuri_personalizate_tip_chk check (tip in ('text', 'numar', 'data', 'alegere', 'da_nu'));

create table if not exists api_chei (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  nume text not null,
  prefix text not null,
  hash text not null,
  scopuri text[] not null default '{}',
  creat_de uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  ultima_folosire_la timestamptz,
  revocata_la timestamptz
);
create unique index if not exists api_chei_hash_unic on api_chei (hash);
create index if not exists api_chei_org_idx on api_chei (org_id, created_at desc);

create table if not exists webhook_endpointuri (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  url text not null,
  secret_enc text not null,
  evenimente text[] not null default '{}',
  activ boolean not null default true,
  esecuri_consecutive integer not null default 0,
  dezactivat_motiv text,
  creat_de uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists webhook_endpointuri_org_idx on webhook_endpointuri (org_id, created_at desc);

create table if not exists webhook_livrari (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  endpoint_id uuid not null references webhook_endpointuri(id) on delete cascade,
  eveniment text not null,
  payload jsonb not null,
  stare text not null default 'in_asteptare',
  incercari integer not null default 0,
  urmatoarea_incercare_la timestamptz not null default now(),
  ultimul_cod integer,
  ultima_eroare text,
  created_at timestamptz not null default now(),
  trimis_la timestamptz
);
create index if not exists webhook_livrari_de_trimis_idx on webhook_livrari (stare, urmatoarea_incercare_la);
create index if not exists webhook_livrari_org_idx on webhook_livrari (org_id, created_at desc);
alter table webhook_livrari drop constraint if exists webhook_livrari_stare_chk;
alter table webhook_livrari add constraint webhook_livrari_stare_chk check (stare in ('in_asteptare', 'trimis', 'esuat'));

grant select, insert, update on campuri_personalizate to app_user;
grant select, insert, update on api_chei to app_user;
grant select, insert, update, delete on webhook_endpointuri to app_user;
grant select, insert, update, delete on webhook_livrari to app_user;

-- Izolare pe organizație (RLS forțat).
alter table campuri_personalizate enable row level security;
alter table campuri_personalizate force row level security;
drop policy if exists campuri_personalizate_tenant_isolation on campuri_personalizate;
create policy campuri_personalizate_tenant_isolation on campuri_personalizate
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);

alter table api_chei enable row level security;
alter table api_chei force row level security;
drop policy if exists api_chei_tenant_isolation on api_chei;
create policy api_chei_tenant_isolation on api_chei
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
-- Căutarea unei chei după hash, la o cerere API (fără organizație încă): se vede doar rândul cu hash-ul din GUC.
drop policy if exists api_chei_cautare on api_chei;
create policy api_chei_cautare on api_chei for select
  using (hash = nullif(current_setting('app.api_cheie_hash', true), ''));

alter table webhook_endpointuri enable row level security;
alter table webhook_endpointuri force row level security;
drop policy if exists webhook_endpointuri_tenant_isolation on webhook_endpointuri;
create policy webhook_endpointuri_tenant_isolation on webhook_endpointuri
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);

alter table webhook_livrari enable row level security;
alter table webhook_livrari force row level security;
drop policy if exists webhook_livrari_tenant_isolation on webhook_livrari;
create policy webhook_livrari_tenant_isolation on webhook_livrari
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
