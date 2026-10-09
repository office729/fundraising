-- Panoul voluntarilor (pagina publică /voluntar/<cod>) — tabele noi, aditiv.
-- Aplicat prin scriptul one-off (db:push e blocat de sandbox). După rulare: node --env-file=.env.local scripts/restore-rls.mjs
-- (politicile + FORCE ROW LEVEL SECURITY sunt înregistrate acolo) și GRANT-urile de mai jos.

create table if not exists volunteer_panel_links (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null unique references organizations(id) on delete cascade,
  cod text not null unique,
  activ boolean not null default true,
  mesaj_implicit text,
  created_by uuid references app_users(id),
  created_at timestamptz not null default now(),
  schimbat_la timestamptz
);

create table if not exists volunteer_visitors (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  prenume text not null,
  telefon text,
  voluntar_id text,
  legat_la timestamptz,
  created_at timestamptz not null default now(),
  ultima_activitate_la timestamptz not null default now()
);
create index if not exists volunteer_visitors_org_idx on volunteer_visitors (org_id, ultima_activitate_la desc);
create index if not exists volunteer_visitors_telefon_idx on volunteer_visitors (org_id, telefon);

create table if not exists volunteer_shares (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  visitor_id uuid not null references volunteer_visitors(id) on delete cascade,
  campaign_page_id uuid not null references fundraising_pages(id) on delete cascade,
  canal text not null,
  ziua date not null,
  created_at timestamptz not null default now()
);
create unique index if not exists volunteer_shares_unic_idx on volunteer_shares (visitor_id, campaign_page_id, canal, ziua);
create index if not exists volunteer_shares_org_idx on volunteer_shares (org_id, created_at desc);
create index if not exists volunteer_shares_campanie_idx on volunteer_shares (campaign_page_id);

create table if not exists volunteer_missions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  visitor_id uuid not null references volunteer_visitors(id) on delete cascade,
  ziua date not null,
  ordine integer not null,
  campaign_page_id uuid not null references fundraising_pages(id) on delete cascade,
  canal text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists volunteer_missions_ordine_idx on volunteer_missions (visitor_id, ziua, ordine);
create unique index if not exists volunteer_missions_unic_idx on volunteer_missions (visitor_id, ziua, campaign_page_id, canal);

create table if not exists volunteer_featured (
  org_id uuid not null references organizations(id) on delete cascade,
  saptamana date not null,
  campaign_page_id uuid not null references fundraising_pages(id) on delete cascade,
  setat_de uuid references app_users(id),
  created_at timestamptz not null default now(),
  primary key (org_id, saptamana)
);

create table if not exists volunteer_campaign_settings (
  org_id uuid not null references organizations(id) on delete cascade,
  campaign_page_id uuid not null references fundraising_pages(id) on delete cascade,
  ascunsa boolean not null default false,
  mesaj text,
  actualizat_la timestamptz not null default now(),
  primary key (org_id, campaign_page_id)
);

grant select, insert, update, delete on
  volunteer_panel_links, volunteer_visitors, volunteer_shares, volunteer_missions, volunteer_featured, volunteer_campaign_settings
  to app_user;
