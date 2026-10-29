-- Calendar intern de programări (înlocuiește Calendly): programul disponibil, tipurile de întâlniri, excepțiile (zile libere / program special) și programările.
-- Aditiv și idempotent; aplicat cu scripts/aplica-programari.mjs. Tabele ale PLATFORMEI (fără org_id): le citește public doar codul serverului după validare
-- (app.programari_public) și le administrează doar echipa platformei (app.platform_admin).

-- O singură linie (id = 1): setările generale și textele paginii de programare.
create table if not exists programari_config (
  id integer primary key default 1 check (id = 1),
  config jsonb not null default '{}'::jsonb,
  actualizat_la timestamptz not null default now(),
  actualizat_de text
);

-- Tipurile de întâlniri pe care le poate alege cine se programează (titlu, durată, descriere, locul sau linkul întâlnirii).
create table if not exists programari_tipuri (
  id uuid primary key default gen_random_uuid(),
  titlu text not null,
  descriere text,
  durata_min integer not null check (durata_min between 10 and 480),
  locatie text,
  activ boolean not null default true,
  ordine integer not null default 0,
  creat_la timestamptz not null default now()
);

-- Programul săptămânal: intervale în ora României (1 = luni … 7 = duminică); o zi poate avea mai multe intervale.
create table if not exists programari_disponibilitate (
  id uuid primary key default gen_random_uuid(),
  zi smallint not null check (zi between 1 and 7),
  de_la time not null,
  pana_la time not null,
  check (pana_la > de_la)
);

-- Excepții pe o dată: „liber” închide ziua; „program” înlocuiește programul săptămânal al zilei cu intervalul dat.
create table if not exists programari_exceptii (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  tip text not null check (tip in ('liber', 'program')),
  de_la time,
  pana_la time,
  nota text,
  creat_la timestamptz not null default now()
);
create index if not exists programari_exceptii_data_idx on programari_exceptii (data);

create table if not exists programari (
  id uuid primary key default gen_random_uuid(),
  tip_id uuid references programari_tipuri(id) on delete set null,
  tip_titlu text not null,
  durata_min integer not null,
  locatie text,
  start_la timestamptz not null,
  sfarsit_la timestamptz not null,
  nume text not null,
  email text not null,
  telefon text,
  organizatie text,
  mesaj text,
  stare text not null default 'confirmata' check (stare in ('confirmata', 'anulata', 'efectuata')),
  token text not null unique,
  org_id uuid references organizations(id) on delete set null,
  sursa text,
  creat_la timestamptz not null default now(),
  anulat_la timestamptz,
  anulat_de text,
  check (sfarsit_la > start_la)
);
create index if not exists programari_start_idx on programari (start_la);
create index if not exists programari_stare_idx on programari (stare, start_la);

grant select, insert, update, delete on programari_config to app_user;
grant select, insert, update, delete on programari_tipuri to app_user;
grant select, insert, update, delete on programari_disponibilitate to app_user;
grant select, insert, update, delete on programari_exceptii to app_user;
grant select, insert, update, delete on programari to app_user;
