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
