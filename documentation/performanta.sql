-- Echipă & Performanță: obiective și rezultate-cheie, activități (planul săptămânii), blocaje, absențe, notificări. Aditiv.
-- Se leagă de modulul KPI existent (angajati, departments, kpi_definitii). Aplicat prin scriptul one-off; RLS/politici: scripts/restore-rls.mjs.

create table if not exists obiective (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  parent_id uuid references obiective(id) on delete set null,
  nivel text not null check (nivel in ('strategic', 'echipa', 'individual')),
  titlu text not null,
  descriere text,
  responsabil_id uuid references angajati(id) on delete set null,
  department_id uuid references departments(id) on delete set null,
  perioada_start date not null,
  perioada_end date not null,
  status text not null default 'activ' check (status in ('activ', 'finalizat', 'anulat')),
  motiv_anulare text,
  vizibilitate text not null default 'organizatie' check (vizibilitate in ('organizatie', 'echipa', 'privat')),
  creat_de uuid references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (perioada_end >= perioada_start)
);
create index if not exists obiective_org_idx on obiective (org_id, perioada_start desc);
create index if not exists obiective_responsabil_idx on obiective (org_id, responsabil_id);
create index if not exists obiective_parent_idx on obiective (parent_id);

create table if not exists obiective_colaboratori (
  obiectiv_id uuid not null references obiective(id) on delete cascade,
  angajat_id uuid not null references angajati(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  primary key (obiectiv_id, angajat_id)
);

create table if not exists obiective_legaturi (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  obiectiv_id uuid not null references obiective(id) on delete cascade,
  legat_de_id uuid not null references obiective(id) on delete cascade,
  tip text not null default 'legat' check (tip in ('sprijina', 'depinde_de', 'legat')),
  created_at timestamptz not null default now(),
  unique (obiectiv_id, legat_de_id),
  check (obiectiv_id <> legat_de_id)
);

create table if not exists rezultate_cheie (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  obiectiv_id uuid not null references obiective(id) on delete cascade,
  titlu text not null,
  descriere text,
  metoda text not null default 'crescator' check (metoda in ('crescator', 'descrescator', 'interval', 'binar')),
  tip_tinta text not null default 'cumulativ' check (tip_tinta in ('cumulativ', 'periodic')),
  unitate text,
  nivel_initial numeric,
  tinta numeric,
  tinta_max numeric,
  valoare_curenta numeric,
  pondere integer not null default 1 check (pondere between 1 and 100),
  sursa text not null default 'manual' check (sursa in ('manual', 'kpi', 'crm')),
  kpi_definitie_id uuid references kpi_definitii(id) on delete set null,
  kpi_angajat_id uuid references angajati(id) on delete set null,
  sursa_config jsonb,
  frecventa_actualizare text not null default 'saptamanal' check (frecventa_actualizare in ('zilnic', 'saptamanal', 'lunar', 'trimestrial')),
  ultima_actualizare timestamptz,
  incredere text check (incredere in ('mare', 'medie', 'scazuta')),
  termen date,
  responsabil_id uuid references angajati(id) on delete set null,
  formula text,
  reguli text,
  atribuire text,
  status text not null default 'activ' check (status in ('activ', 'anulat')),
  ordine integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists rezultate_cheie_obiectiv_idx on rezultate_cheie (obiectiv_id, ordine);
create index if not exists rezultate_cheie_org_idx on rezultate_cheie (org_id);

-- Istoricul unui rezultat-cheie: valori, schimbări de țintă, de responsabil. Cu comentariu și dovadă.
create table if not exists rezultate_actualizari (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  rezultat_id uuid not null references rezultate_cheie(id) on delete cascade,
  tip text not null default 'valoare' check (tip in ('valoare', 'tinta', 'responsabil', 'incredere', 'nota')),
  valoare numeric,
  valoare_anterioara numeric,
  tinta numeric,
  comentariu text,
  dovada_url text,
  incredere text check (incredere in ('mare', 'medie', 'scazuta')),
  detalii jsonb,
  autor_user_id uuid references app_users(id),
  created_at timestamptz not null default now()
);
create index if not exists rezultate_actualizari_rezultat_idx on rezultate_actualizari (rezultat_id, created_at desc);

create table if not exists activitati (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  titlu text not null,
  descriere text,
  responsabil_id uuid references angajati(id) on delete set null,
  obiectiv_id uuid references obiective(id) on delete set null,
  rezultat_id uuid references rezultate_cheie(id) on delete set null,
  prioritate text not null default 'medie' check (prioritate in ('critica', 'mare', 'medie', 'scazuta')),
  termen date,
  efort_ore numeric(5, 1),
  status text not null default 'de_facut' check (status in ('de_facut', 'in_lucru', 'in_asteptare', 'blocat', 'finalizat', 'anulat')),
  aprobare_necesara boolean not null default false,
  aprobata_de uuid references app_users(id),
  aprobata_la timestamptz,
  rezultat_asteptat text,
  criteriu_finalizare text,
  depinde_de uuid references activitati(id) on delete set null,
  recurenta text not null default 'nu' check (recurenta in ('nu', 'saptamanal', 'lunar')),
  sursa text not null default 'manual' check (sursa in ('manual', 'automatizare')),
  cheie_automatizare text,
  finalizat_la timestamptz,
  creat_de uuid references app_users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists activitati_org_termen_idx on activitati (org_id, termen);
create index if not exists activitati_responsabil_idx on activitati (org_id, responsabil_id, status);
create index if not exists activitati_obiectiv_idx on activitati (obiectiv_id);
create unique index if not exists activitati_automatizare_idx on activitati (org_id, cheie_automatizare) where cheie_automatizare is not null;

create table if not exists blocaje (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  activitate_id uuid references activitati(id) on delete cascade,
  obiectiv_id uuid references obiective(id) on delete cascade,
  motiv text not null,
  responsabil_rezolvare_id uuid references angajati(id) on delete set null,
  raportat_de_id uuid references angajati(id) on delete set null,
  termen_revenire date not null,
  necesita_decizie boolean not null default false,
  status text not null default 'deschis' check (status in ('deschis', 'rezolvat', 'anulat')),
  rezolvare text,
  deschis_la timestamptz not null default now(),
  rezolvat_la timestamptz
);
create index if not exists blocaje_org_status_idx on blocaje (org_id, status);

create table if not exists angajati_absente (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  angajat_id uuid not null references angajati(id) on delete cascade,
  tip text not null default 'concediu' check (tip in ('concediu', 'medical', 'altele')),
  data_start date not null,
  data_sfarsit date not null,
  nota text,
  created_at timestamptz not null default now(),
  check (data_sfarsit >= data_start)
);
create index if not exists angajati_absente_idx on angajati_absente (org_id, angajat_id, data_start);

create table if not exists performanta_notificari (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  app_user_id uuid not null references app_users(id) on delete cascade,
  tip text not null,
  titlu text not null,
  continut text,
  link text,
  cheie_dedup text,
  citit boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists performanta_notificari_user_idx on performanta_notificari (org_id, app_user_id, citit, created_at desc);
create unique index if not exists performanta_notificari_dedup_idx on performanta_notificari (org_id, app_user_id, cheie_dedup) where cheie_dedup is not null;

grant select, insert, update, delete on
  obiective, obiective_colaboratori, obiective_legaturi, rezultate_cheie, rezultate_actualizari, activitati, blocaje, angajati_absente, performanta_notificari
  to app_user;
