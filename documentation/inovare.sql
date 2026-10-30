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

-- ---------- v2: obiectiv și frecvență, stare „Văzută", istoric de stări, raportări, reevaluare ----------
alter table inovare_propuneri add column if not exists obiectiv text;                 -- ce vrea ONG-ul să crească (donatii_recurente, formular_230, d177_sponsorizari, campanii_caz, retentie, timp, alt)
alter table inovare_propuneri add column if not exists frecventa text;                -- cât de des apare problema (zilnic, saptamanal, lunar, rar)
alter table inovare_propuneri add column if not exists reevaluare_la date;            -- pentru „Nu acum": când reluăm ideea
alter table inovare_propuneri add column if not exists motiv_ascundere text;          -- 'raportata' (de alt ONG), 'echipa', 'unita'
alter table inovare_propuneri add column if not exists primul_raspuns_la timestamptz; -- prima dată când echipa a răspuns (stare sau text): baza pentru termenul de 5 zile lucrătoare
alter table inovare_propuneri add column if not exists organizatie_slug text;         -- doar pentru linkul din emailuri; nu se afișează

do $$
declare c record;
begin
  for c in select conname from pg_constraint where conrelid = 'inovare_propuneri'::regclass and contype = 'c' and pg_get_constraintdef(oid) ~ '(stare|obiectiv|frecventa) ' loop
    execute format('alter table inovare_propuneri drop constraint %I', c.conname);
  end loop;
end $$;
alter table inovare_propuneri add constraint inovare_propuneri_stare_check check (stare in ('propus', 'vazuta', 'in_planificare', 'in_dezvoltare', 'finalizat', 'nu_acum'));
alter table inovare_propuneri add constraint inovare_propuneri_obiectiv_check check (obiectiv is null or obiectiv in ('donatii_recurente', 'formular_230', 'd177_sponsorizari', 'campanii_caz', 'retentie', 'timp', 'alt'));
alter table inovare_propuneri add constraint inovare_propuneri_frecventa_check check (frecventa is null or frecventa in ('zilnic', 'saptamanal', 'lunar', 'rar'));

-- Istoricul schimbărilor de stare: baza pentru timpii de răspuns. Scris doar de echipa platformei.
create table if not exists inovare_evenimente (
  id uuid primary key default gen_random_uuid(),
  propunere_id uuid not null references inovare_propuneri(id) on delete cascade,
  stare_veche text,
  stare_noua text not null,
  creat_la timestamptz not null default now()
);
create index if not exists inovare_evenimente_idee_idx on inovare_evenimente (propunere_id, creat_la);

-- Raportări ale altor organizații (conținut inadecvat sau cu date personale). Ideea raportată se ascunde imediat, iar echipa o analizează.
create table if not exists inovare_raportari (
  propunere_id uuid not null references inovare_propuneri(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references app_users(id) on delete set null,
  motiv text,
  creat_la timestamptz not null default now(),
  primary key (propunere_id, org_id)
);

grant select, insert, update, delete on inovare_evenimente to app_user;
grant select, insert, update, delete on inovare_raportari to app_user;
alter table inovare_voturi add column if not exists organizatie_slug text;           -- doar pentru linkul din emailul către votanți
