-- Voluntari: sarcini online, activități pe teren (ture/roluri), înscrieri, ore și raportări de probleme. Aditiv; aplicat cu
-- scripts/aplica-voluntari-activitati.mjs. Politicile RLS sunt în scripts/restore-rls.mjs (volunteer_*_tenant_isolation).

-- Contact opțional al voluntarului (confirmări de înscriere). Nu e obligatoriu la intrarea pe link.
alter table volunteer_visitors add column if not exists email text;

-- Sarcini online (distribuie o campanie, scrie un text, traduce, fă o grafică…).
create table if not exists volunteer_tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  titlu text not null,
  descriere text not null,
  tip text not null default 'distribuie',
  campaign_page_id uuid references fundraising_pages(id) on delete set null,
  text_recomandat text,
  link_baza text,
  imagine_url text,
  canale text not null default '',
  incepe_la date,
  termen date,
  nr_voluntari integer,
  minute_estimate integer,
  instructiuni text,
  stare text not null default 'publicata',
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists volunteer_tasks_org_idx on volunteer_tasks (org_id, created_at desc);

create table if not exists volunteer_task_engagements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  task_id uuid not null references volunteer_tasks(id) on delete cascade,
  visitor_id uuid not null references volunteer_visitors(id) on delete cascade,
  stare text not null default 'angajat',
  link_postare text,
  confirmat boolean not null default false,
  created_at timestamptz not null default now(),
  finalizat_la timestamptz,
  unique (task_id, visitor_id)
);
create index if not exists volunteer_task_engagements_org_idx on volunteer_task_engagements (org_id, created_at desc);

-- Activități pe teren.
create table if not exists volunteer_activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  titlu text not null,
  descriere text,
  locatie text not null,
  localitate text,
  incepe_la timestamptz not null,
  se_termina_la timestamptz not null,
  coordonator_nume text,
  coordonator_telefon text,
  aprobare text not null default 'automata',
  cerinte text,
  instructiuni text,
  contact_zi text,
  cu_minori boolean not null default false,
  rezultat_eticheta text,
  rezultat_valoare numeric(12,2),
  campaign_page_id uuid references fundraising_pages(id) on delete set null,
  stare text not null default 'publicata',
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists volunteer_activities_org_idx on volunteer_activities (org_id, incepe_la desc);

-- Tură + rol într-un singur rând: „Primire, 09–12, 6 locuri”. Implicit o singură linie „Voluntar” pe toată activitatea.
create table if not exists volunteer_shifts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  activity_id uuid not null references volunteer_activities(id) on delete cascade,
  nume text not null default 'Voluntar',
  incepe_la timestamptz not null,
  se_termina_la timestamptz not null,
  locuri integer not null default 10
);
create index if not exists volunteer_shifts_activity_idx on volunteer_shifts (activity_id);

create table if not exists volunteer_signups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  activity_id uuid not null references volunteer_activities(id) on delete cascade,
  shift_id uuid not null references volunteer_shifts(id) on delete cascade,
  visitor_id uuid not null references volunteer_visitors(id) on delete cascade,
  status text not null default 'confirmata',
  ore_calculate numeric(5,2),
  ore_validate numeric(5,2),
  validat_la timestamptz,
  validat_de uuid references app_users(id) on delete set null,
  observatii text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shift_id, visitor_id)
);
create index if not exists volunteer_signups_org_idx on volunteer_signups (org_id, created_at desc);
create index if not exists volunteer_signups_activity_idx on volunteer_signups (activity_id);
create index if not exists volunteer_signups_visitor_idx on volunteer_signups (visitor_id);

-- „Raportează o problemă”: ajunge doar la echipă, separat de notele din profil.
create table if not exists volunteer_reports (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  visitor_id uuid references volunteer_visitors(id) on delete set null,
  activity_id uuid references volunteer_activities(id) on delete set null,
  task_id uuid references volunteer_tasks(id) on delete set null,
  descriere text not null,
  stare text not null default 'noua',
  created_at timestamptz not null default now()
);
create index if not exists volunteer_reports_org_idx on volunteer_reports (org_id, created_at desc);

alter table volunteer_tasks enable row level security;
alter table volunteer_tasks force row level security;
alter table volunteer_task_engagements enable row level security;
alter table volunteer_task_engagements force row level security;
alter table volunteer_activities enable row level security;
alter table volunteer_activities force row level security;
alter table volunteer_shifts enable row level security;
alter table volunteer_shifts force row level security;
alter table volunteer_signups enable row level security;
alter table volunteer_signups force row level security;
alter table volunteer_reports enable row level security;
alter table volunteer_reports force row level security;

grant select, insert, update, delete on
  volunteer_tasks, volunteer_task_engagements, volunteer_activities, volunteer_shifts, volunteer_signups, volunteer_reports
  to app_user;

-- Politici de izolare pe organizație (aceleași ca în scripts/restore-rls.mjs; repetate aici ca scriptul să fie autosuficient).
drop policy if exists volunteer_tasks_tenant_isolation on volunteer_tasks;
create policy volunteer_tasks_tenant_isolation on volunteer_tasks
  using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
drop policy if exists volunteer_task_engagements_tenant_isolation on volunteer_task_engagements;
create policy volunteer_task_engagements_tenant_isolation on volunteer_task_engagements
  using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
drop policy if exists volunteer_activities_tenant_isolation on volunteer_activities;
create policy volunteer_activities_tenant_isolation on volunteer_activities
  using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
drop policy if exists volunteer_shifts_tenant_isolation on volunteer_shifts;
create policy volunteer_shifts_tenant_isolation on volunteer_shifts
  using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
drop policy if exists volunteer_signups_tenant_isolation on volunteer_signups;
create policy volunteer_signups_tenant_isolation on volunteer_signups
  using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
drop policy if exists volunteer_reports_tenant_isolation on volunteer_reports;
create policy volunteer_reports_tenant_isolation on volunteer_reports
  using      (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);

-- Etapa 2: remindere și mulțumiri (trimise o singură dată), check-in, link de coordonator, invitații cu acord.
alter table volunteer_signups add column if not exists reminder_trimis_la timestamptz;
alter table volunteer_signups add column if not exists multumire_trimisa_la timestamptz;
alter table volunteer_signups add column if not exists checkin_la timestamptz;

-- Linkul coordonatorului: un cod secret pe activitate, valabil până la câteva zile după încheierea activității.
alter table volunteer_activities add column if not exists coordinator_token text;
create unique index if not exists volunteer_activities_coordinator_token_idx on volunteer_activities (coordinator_token) where coordinator_token is not null;

-- Invitațiile la activități se trimit doar celor care au bifat explicit; cel mult una pe săptămână.
alter table volunteer_visitors add column if not exists acord_invitatii boolean not null default false;
alter table volunteer_visitors add column if not exists ultima_invitatie_la timestamptz;

-- Pagina coordonatorului (/coordonator/<cod>) găsește activitatea după codul secret, înainte să știe organizația: citire sub app.public_lookup.
drop policy if exists volunteer_activities_coordinator_lookup on volunteer_activities;
create policy volunteer_activities_coordinator_lookup on volunteer_activities for select
  using (nullif(current_setting('app.public_lookup', true), '') = 'true');

-- Etapa 3: la „Altceva”, managerul scrie ce sarcină sau proiect este (apare în loc de „Altceva”).
alter table volunteer_tasks add column if not exists tip_personalizat text;
