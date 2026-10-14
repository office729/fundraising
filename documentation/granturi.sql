-- Granturi: registrul cererilor de finanțare și dosarul standard al organizației. Aditiv și idempotent; aplicat cu scripts/aplica-granturi.mjs
-- (politicile RLS sunt și în scripts/restore-rls.mjs: granturi_tenant_isolation, granturi_dosar_tenant_isolation).
create table if not exists granturi (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  finantator text not null,
  titlu text not null,
  tip_finantator text not null default 'alt',
  stare text not null default 'identificat',
  suma numeric(14,2),
  moneda text not null default 'RON',
  termen date,
  link text,
  responsabil_id uuid references app_users(id) on delete set null,
  nota text,
  cerinte text,
  eligibilitate jsonb not null default '[]'::jsonb,
  documente jsonb not null default '[]'::jsonb,
  draft text,
  suma_castigata numeric(14,2),
  data_decizie date,
  termen_raportare date,
  reminder_7z_la timestamptz,
  reminder_1z_la timestamptz,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists granturi_org_termen_idx on granturi (org_id, termen);

create table if not exists granturi_dosar (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  continut jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create unique index if not exists granturi_dosar_org_uniq on granturi_dosar (org_id);

grant select, insert, update, delete on granturi to app_user;
grant select, insert, update, delete on granturi_dosar to app_user;

-- Fișiere atașate unei cereri (referințe către bucket-ul privat org-docs-private, ca la documentele firmelor). Aditiv.
alter table granturi add column if not exists fisiere jsonb not null default '[]'::jsonb;
