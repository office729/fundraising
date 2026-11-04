-- Analize cu AI pe contul organizației (Anthropic): analiza săptămânală a reclamelor și analiza ONG-urilor. Fiecare ONG își folosește propria cheie (vezi documentation/ai-org.sql).
-- Aditiv și idempotent; aplicat cu scripts/aplica-analize-ai.mjs (rol migrator). Fără alte tabele atinse.
--
-- analize_reclame: rezultatul analizei reclamelor (JSON validat strict în aplicație). Un rând se creează ÎNAINTE de apelul AI (stare „in_lucru”),
--   ca două cereri simultane (cron + buton, două taburi) să nu plătească de două ori; cron-ul e idempotent pe săptămână (index unic parțial pe luni).
-- analize_ong: raportul despre cum strânge fonduri un ONG (Claude cu căutare web), rulat în fundal. Indexul unic parțial pe (org_id, nume_norm) cât timp
--   starea e „in_lucru” face blocarea atomică: a doua analiză pentru același ONG nu poate porni cât prima e în lucru.
create table if not exists analize_reclame (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  stare text not null default 'in_lucru',
  sursa text not null default 'manual',
  saptamana date,
  perioada_de date not null,
  perioada_pana date not null,
  model text,
  rezultat jsonb,
  date_sumar jsonb,
  eroare text,
  cost_usd numeric(12, 6) not null default 0,
  creat_de uuid references app_users(id) on delete set null,
  creat_la timestamptz not null default now(),
  actualizat_la timestamptz not null default now()
);
do $$ begin
  alter table analize_reclame add constraint analize_reclame_stare_chk check (stare in ('in_lucru', 'gata', 'eroare'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table analize_reclame add constraint analize_reclame_sursa_chk check (sursa in ('manual', 'cron'));
exception when duplicate_object then null; end $$;
create index if not exists analize_reclame_org_idx on analize_reclame (org_id, creat_la desc);
create unique index if not exists analize_reclame_saptamana_uniq on analize_reclame (org_id, saptamana) where sursa = 'cron';

create table if not exists analize_ong (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  nume text not null,
  nume_norm text not null,
  site text,
  interes text,
  stare text not null default 'in_lucru',
  raport text,
  surse jsonb not null default '[]'::jsonb,
  model text,
  cautari integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  eroare text,
  creat_de uuid references app_users(id) on delete set null,
  creat_la timestamptz not null default now(),
  terminat_la timestamptz
);
do $$ begin
  alter table analize_ong add constraint analize_ong_stare_chk check (stare in ('in_lucru', 'gata', 'eroare'));
exception when duplicate_object then null; end $$;
create index if not exists analize_ong_org_idx on analize_ong (org_id, creat_la desc);
create unique index if not exists analize_ong_in_lucru_uniq on analize_ong (org_id, nume_norm) where stare = 'in_lucru';

grant select, insert, update, delete on analize_reclame to app_user;
grant select, insert, update, delete on analize_ong to app_user;

-- Izolare pe organizație (RLS forțat). Fără app.current_org_id setat nu se vede nimic.
alter table analize_reclame enable row level security;
alter table analize_reclame force row level security;
drop policy if exists analize_reclame_tenant_isolation on analize_reclame;
create policy analize_reclame_tenant_isolation on analize_reclame
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
alter table analize_ong enable row level security;
alter table analize_ong force row level security;
drop policy if exists analize_ong_tenant_isolation on analize_ong;
create policy analize_ong_tenant_isolation on analize_ong
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
