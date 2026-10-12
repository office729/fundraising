-- Trafic măsurat de Alexandrit pe paginile publice de campanie (vizualizări, deschiderea formularului de donație).
-- Aditiv și idempotent. După rulare: node --env-file=.env.local scripts/restore-rls.mjs (politica + FORCE ROW LEVEL SECURITY sunt înregistrate acolo).
create table if not exists campaign_page_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  page_id uuid not null references fundraising_pages(id) on delete cascade,
  tip text not null,
  ziua date not null,
  vizitator text not null,
  sursa text not null default 'direct',
  sursa_detaliu text,
  utm_campanie text,
  dispozitiv text not null default 'desktop',
  tara text,
  created_at timestamptz not null default now()
);
create index if not exists campaign_page_events_page_ziua_idx on campaign_page_events (page_id, ziua);
create index if not exists campaign_page_events_org_ziua_idx on campaign_page_events (org_id, ziua);

grant select, insert on campaign_page_events to app_user;
