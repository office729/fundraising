-- Centrul de inovare în fundraising: propunerile ONG-urilor (idei de funcționalități), voturile lor și răspunsul echipei. Aditiv și idempotent;
-- aplicat cu scripts/aplica-inovare.mjs. Tabele ale platformei (nu aparțin unei organizații): toate organizațiile își văd reciproc ideile (titlu, descriere, stare),
-- dar nu și adresele de email sau cine a votat. Citirea trece doar prin codul serverului, după verificarea sesiunii (app.inovare_citire); echipa platformei
-- administrează cu app.platform_admin.

create table if not exists inovare_propuneri (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete set null,
  user_id uuid references app_users(id) on delete set null,
  autor_nume text,                                  -- doar prenumele, la momentul propunerii (afișat dacă organizația acceptă)
  org_nume text,                                    -- numele organizației la momentul propunerii
  afiseaza_organizatia boolean not null default true,
  titlu text not null,
  descriere text not null,
  cum_faci_acum text,
  categorie text not null,
  stare text not null default 'propus' check (stare in ('propus', 'in_planificare', 'in_dezvoltare', 'finalizat', 'nu_acum')),
  efort text check (efort in ('scazut', 'mediu', 'mare')),
  raspuns_echipa text,
  ascunsa boolean not null default false,           -- ascunsă de echipă (spam, duplicat, inadecvat)
  duplicat_din uuid references inovare_propuneri(id) on delete set null,
  creat_la timestamptz not null default now(),
  actualizat_la timestamptz not null default now(),
  finalizat_la timestamptz
);
create index if not exists inovare_propuneri_stare_idx on inovare_propuneri (stare, creat_la desc);
create index if not exists inovare_propuneri_org_idx on inovare_propuneri (org_id);

-- Un vot pe organizație pentru fiecare idee (toți membrii aceleiași organizații împart același vot).
create table if not exists inovare_voturi (
  propunere_id uuid not null references inovare_propuneri(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references app_users(id) on delete set null,
  creat_la timestamptz not null default now(),
  primary key (propunere_id, org_id)
);
create index if not exists inovare_voturi_org_idx on inovare_voturi (org_id);

grant select, insert, update, delete on inovare_propuneri to app_user;
grant select, insert, update, delete on inovare_voturi to app_user;
