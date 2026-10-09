-- CRM Persoane fizice: câmpuri de lucru pe donator + importuri de donații (sursă reversibilă). Aditiv.
-- Aplicat prin scriptul one-off (db:push e blocat de sandbox). RLS/politicile: vezi scripts/restore-rls.mjs.

-- Rândurile existente primesc data rulării; apoi se corectează pe organizații (FORCE RLS cere GUC-ul org): adaugat_la = prima_donatie_la.
alter table donatori_reali add column if not exists adaugat_la timestamptz not null default now();
alter table donatori_reali add column if not exists sunat_la timestamptz;
alter table donatori_reali add column if not exists multumit_la timestamptz;
alter table donatori_reali add column if not exists a_raspuns boolean not null default false;
alter table donatori_reali add column if not exists nu_contactat boolean not null default false;
alter table donatori_reali add column if not exists reapel_la date;
alter table donatori_reali add column if not exists wb_stage text;
alter table donatori_reali add column if not exists import_id uuid;

create table if not exists donatori_importuri (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  nume text not null,
  de date,
  pana date,
  nr_randuri integer not null default 0,
  nr_importate integer not null default 0,
  nr_duplicate integer not null default 0,
  nr_donatori_noi integer not null default 0,
  created_by uuid references app_users(id),
  created_at timestamptz not null default now()
);
create index if not exists donatori_importuri_org_idx on donatori_importuri (org_id, created_at desc);

create table if not exists donatii_importate (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  import_id uuid not null references donatori_importuri(id) on delete cascade,
  email text not null,
  nume text,
  suma integer not null,
  moneda text not null default 'RON',
  suma_originala numeric(14,2),
  data timestamptz not null,
  proiect text,
  proiect_page_id uuid references fundraising_pages(id) on delete set null,
  procesator text,
  id_extern text,
  status text not null default 'reusita',
  created_at timestamptz not null default now()
);
create index if not exists donatii_importate_org_email_idx on donatii_importate (org_id, email);
create index if not exists donatii_importate_import_idx on donatii_importate (import_id);
create unique index if not exists donatii_importate_extern_idx on donatii_importate (org_id, id_extern) where id_extern is not null;

grant select, insert, update, delete on donatori_importuri, donatii_importate to app_user;
