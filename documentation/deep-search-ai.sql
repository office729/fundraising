-- Deep Search pentru decidenți (fișa firmei) + „Caută pe internet (AI)”. Aditiv și idempotent; aplicat cu scripts/aplica-deep-search-ai.mjs (rol migrator).
--
-- Ce adaugă:
--  1. prospectare_candidati: câmpurile de care are nevoie căutarea unită pe mai mulți furnizori. Căutarea aduce DOAR nume + funcție (gratuit); emailul și telefonul se
--     cumpără la „Aprobă”, de la furnizorul care a găsit persoana, deci rândul trebuie să-i țină minte id-urile (ids), celelalte surse care au găsit-o (alte_surse),
--     telefonul (dacă l-a dat deja furnizorul sau a fost publicat), linkul sursei (pentru „Internet (AI)”) și cererea Lusha (Lusha leagă îmbogățirea de cererea de căutare).
--  2. contacts.provenienta: de unde vine contactul (apollo | prospeo | lusha | hunter | web-ai). Nu folosim consent_source, pentru că acela se șterge când
--     colega schimbă acordul de email. „web-ai” = găsit de AI pe internet (inima verde, filtrul „cu contacte găsite cu AI”).
--  3. deep_search_ai: memoria căutării AI pe internet, un rând pe firmă (30 de zile). Conține doar metadate (când, cine, câți, costul); persoanele găsite stau în
--     prospectare_candidati, unde se aplică aceleași reguli GDPR (respinse = anonimizate, rămâne doar amprenta în extra.nuMaiCauta).
--  4. Indecși mici pentru filtrele din lista Companii („cu contacte găsite cu AI”, „trimise în Waalaxy”).
alter table prospectare_candidati add column if not exists telefon text;
alter table prospectare_candidati add column if not exists ids jsonb not null default '{}'::jsonb;
alter table prospectare_candidati add column if not exists alte_surse text[] not null default '{}'::text[];
alter table prospectare_candidati add column if not exists cerere_lusha text;
alter table prospectare_candidati add column if not exists sursa_url text;

alter table contacts add column if not exists provenienta text;
create index if not exists contacts_web_ai_idx on contacts (company_id) where provenienta = 'web-ai';
create index if not exists contacts_outreach_idx on contacts (company_id) where outreach_stare is not null;

create table if not exists deep_search_ai (
  org_id uuid not null references organizations(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  created_at timestamptz not null default now(),
  created_by uuid references app_users(id) on delete set null,
  gasiti integer not null default 0,
  surse integer not null default 0,
  cost_usd numeric(12, 6) not null default 0,
  model text,
  primary key (org_id, company_id)
);

grant select, insert, update, delete on deep_search_ai to app_user;

-- Izolare pe organizație (RLS forțat). Fără app.current_org_id setat nu se vede nimic.
alter table deep_search_ai enable row level security;
alter table deep_search_ai force row level security;
drop policy if exists deep_search_ai_tenant_isolation on deep_search_ai;
create policy deep_search_ai_tenant_isolation on deep_search_ai
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
