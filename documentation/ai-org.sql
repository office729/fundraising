-- AI pe contul organizației (Anthropic): fiecare ONG își folosește propria cheie (criptată în prospectare_chei, provider = 'anthropic'; vezi lib/secret-box.ts).
-- Aditiv și idempotent; aplicat cu scripts/aplica-ai-org.mjs (rol migrator).
--
-- ai_consum: câte un rând pentru fiecare apel către Claude (tokeni, căutări web, cost estimat în USD după prețul modelului), pe instrument.
--   Evidența nu blochează niciodată generarea: dacă scrierea eșuează, apelul AI merge mai departe.
-- ai_setari: alegerile organizației pentru AI (modelul și bugetul lunar în USD; bugetul e doar un reper afișat, limita reală se pune în consola Anthropic).
create table if not exists ai_consum (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  instrument text not null,
  model text not null,
  tokeni_in integer not null default 0,
  tokeni_out integer not null default 0,
  tokeni_cache_citire integer not null default 0,
  tokeni_cache_scriere integer not null default 0,
  cautari_web integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists ai_consum_org_idx on ai_consum (org_id, created_at desc);

create table if not exists ai_setari (
  org_id uuid primary key references organizations(id) on delete cascade,
  model text,
  buget_usd numeric(10, 2),
  updated_at timestamptz not null default now()
);

grant select, insert on ai_consum to app_user;
grant select, insert, update, delete on ai_setari to app_user;

-- Izolare pe organizație (RLS forțat). Fără app.current_org_id setat nu se vede nimic.
alter table ai_consum enable row level security;
alter table ai_consum force row level security;
drop policy if exists ai_consum_tenant_isolation on ai_consum;
create policy ai_consum_tenant_isolation on ai_consum
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
alter table ai_setari enable row level security;
alter table ai_setari force row level security;
drop policy if exists ai_setari_tenant_isolation on ai_setari;
create policy ai_setari_tenant_isolation on ai_setari
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
