-- Personalizarea dashboardului unei organizații (meniu, familie vizuală, blocuri de pe prima pagină). Aditiv și idempotent;
-- aplicat cu scripts/aplica-personalizare.mjs sau lipit în SQL Editor (partea de DDL + politicile de mai jos).
--
-- org_personalizare: o singură linie pe organizație, cu configurarea ca JSON validat strict de aplicație (lib/personalizare-org.ts).
-- E DOAR configurare, nu conținut: nu conține date personale și nu atinge tabelele de date ale organizației.
-- Citirea: orice membru al organizației (ca să i se aplice aspectul). Scrierea: doar echipa platformei (app.platform_admin), din
-- /platform-admin, cu înregistrare în jurnalul de audit al organizației. Un owner/admin al organizației NU o poate modifica.
create table if not exists org_personalizare (
  org_id uuid primary key references organizations(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  actualizat_la timestamptz not null default now(),
  actualizat_de uuid references app_users(id) on delete set null
);

grant select, insert, update, delete on org_personalizare to app_user;

alter table org_personalizare enable row level security;
alter table org_personalizare force row level security;

-- Politicile (rulează o singură dată; la a doua rulare dau „already exists”, ceea ce e în regulă).
create policy org_personalizare_membri_citire on org_personalizare for select
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
create policy org_personalizare_platforma on org_personalizare for all
  using (nullif(current_setting('app.platform_admin', true), '') = 'true')
  with check (nullif(current_setting('app.platform_admin', true), '') = 'true');

-- Notițe interne ale echipei platformei despre ce diferă la o organizație. Tabel separat de org_personalizare: DOAR echipa platformei (app.platform_admin) îl poate
-- citi sau scrie; membrii organizației nu au nicio politică, deci nu văd nimic, iar aplicația organizației nu îl selectează niciodată.
create table if not exists org_personalizare_note (
  org_id uuid primary key references organizations(id) on delete cascade,
  nota text not null default '',
  actualizat_la timestamptz not null default now(),
  actualizat_de uuid references app_users(id) on delete set null
);

grant select, insert, update, delete on org_personalizare_note to app_user;

alter table org_personalizare_note enable row level security;
alter table org_personalizare_note force row level security;

create policy org_personalizare_note_platforma on org_personalizare_note for all
  using (nullif(current_setting('app.platform_admin', true), '') = 'true')
  with check (nullif(current_setting('app.platform_admin', true), '') = 'true');

-- Registrul de timp pentru munca custom și suportul unei organizații (vezi lib/timp-custom.ts). Intrările: cine a lucrat (claude / echipa), categoria, descrierea (vizibilă
-- clientului), minutele și data; un timer pornit e un rând cu pornit_la setat și minute null, până la oprire. Un singur timer pornit pe administrator.
-- Citire pentru clienți: doar membrii organizației și doar dacă pagina „Timp alocat” e activată (config.arataTimp în org_personalizare), fără timerele încă pornite.
-- Tarifele (org_timp_tarife) sunt doar pentru echipa platformei: clientul nu le vede niciodată.
create table if not exists org_timp (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  executant text not null check (executant in ('claude', 'echipa')),
  categorie text not null check (categorie in ('custom', 'integrare', 'suport', 'altele')),
  descriere text not null check (char_length(descriere) between 3 and 300),
  minute integer check (minute between 1 and 1440),
  data date not null default current_date,
  pornit_la timestamptz,
  oprit_la timestamptz,
  creat_de uuid references app_users(id) on delete set null,
  creat_la timestamptz not null default now(),
  check (
    (pornit_la is null and oprit_la is null and minute is not null)
    or (pornit_la is not null and oprit_la is null and minute is null)
    or (pornit_la is not null and oprit_la is not null and minute is not null)
  )
);
create index if not exists org_timp_org_idx on org_timp (org_id, data desc, creat_la desc);
create unique index if not exists org_timp_un_timer_pornit on org_timp (creat_de) where pornit_la is not null and oprit_la is null;

create table if not exists org_timp_tarife (
  org_id uuid primary key references organizations(id) on delete cascade,
  tarif_claude numeric(10, 2) not null default 0,
  tarif_echipa numeric(10, 2) not null default 0,
  moneda text not null default 'RON' check (moneda in ('RON', 'EUR')),
  actualizat_la timestamptz not null default now(),
  actualizat_de uuid references app_users(id) on delete set null
);

grant select, insert, update, delete on org_timp to app_user;
grant select, insert, update, delete on org_timp_tarife to app_user;

alter table org_timp enable row level security;
alter table org_timp force row level security;
alter table org_timp_tarife enable row level security;
alter table org_timp_tarife force row level security;

create policy org_timp_platforma on org_timp for all
  using (nullif(current_setting('app.platform_admin', true), '') = 'true')
  with check (nullif(current_setting('app.platform_admin', true), '') = 'true');
create policy org_timp_membri_citire on org_timp for select
  using (
    org_id = nullif(current_setting('app.current_org_id', true), '')::uuid
    and (pornit_la is null or oprit_la is not null)
    and exists (select 1 from org_personalizare p where p.org_id = org_timp.org_id and p.config ->> 'arataTimp' = 'true')
  );
create policy org_timp_tarife_platforma on org_timp_tarife for all
  using (nullif(current_setting('app.platform_admin', true), '') = 'true')
  with check (nullif(current_setting('app.platform_admin', true), '') = 'true');
