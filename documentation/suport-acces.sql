-- Acces de suport cu acordul organizației + jurnal de erori fără date personale. Aditiv și idempotent; aplicat cu scripts/aplica-suport-acces.mjs.
--
-- suport_acces: un owner/admin al organizației acordă echipei platformei acces la „Diagnoza contului” (configurare, module,
-- numărători, erori recente — fără conținutul CRM). Accesul expiră singur (expira_la) și poate fi retras oricând (retras_la).
-- erori_aplicatie: erori ale paginilor/acțiunilor unei organizații, cu mesajul curățat de date personale (lib/suport/date-personale.ts).
-- Echipa platformei le citește DOAR cât timp organizația are un acces activ (politica erori_aplicatie_platforma_citire).
create table if not exists suport_acces (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  acordat_de uuid references app_users(id) on delete set null,
  acordat_la timestamptz not null default now(),
  expira_la timestamptz not null,
  retras_la timestamptz,
  retras_de uuid references app_users(id) on delete set null
);
create index if not exists suport_acces_org_idx on suport_acces (org_id, expira_la desc);

create table if not exists erori_aplicatie (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  zona text not null,
  cod text,
  mesaj text not null,
  created_at timestamptz not null default now()
);
create index if not exists erori_aplicatie_org_idx on erori_aplicatie (org_id, created_at desc);

grant select, insert, update on suport_acces to app_user;
grant select, insert, delete on erori_aplicatie to app_user;
