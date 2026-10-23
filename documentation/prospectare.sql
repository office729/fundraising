-- Prospectare de decidenți pentru firme (pachetul IMPACT): fiecare ONG își folosește PROPRIILE chei la furnizori (Apollo, Hunter), criptate;
-- decidenții găsiți așteaptă aprobarea echipei înainte să devină contacte. Furnizori de date: Lusha, Apollo, Prospeo, Hunter; Waalaxy primește persoanele aprobate. Aditiv și idempotent; aplicat cu scripts/aplica-prospectare.mjs.
--
-- prospectare_chei: cheia API a organizației la un furnizor (AES-256-GCM, vezi lib/secret-box.ts); în interfață apare doar o amprentă (ultimele caractere).
-- „setari” păstrează alegerile conectorului (Waalaxy: lista și campania).
-- prospectare_candidati: persoanele găsite pentru o firmă, în stare „nou” până sunt aprobate sau respinse (cutia „De aprobat”).
-- prospectare_jurnal: fiecare apel către un furnizor (ce operație, cât a costat în unități), pentru limita zilnică și pentru transparență.
-- prospectare_suprimati: persoane care nu mai trebuie propuse niciodată (au cerut ștergerea sau au fost respinse definitiv).
create table if not exists prospectare_chei (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  provider text not null,
  cheie_enc text not null,
  amprenta text not null default '',
  setari jsonb not null default '{}'::jsonb,
  adaugat_de uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, provider)
);

alter table prospectare_chei add column if not exists setari jsonb not null default '{}'::jsonb;

create table if not exists prospectare_candidati (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  nume text not null,
  nume_norm text not null,
  rol text,
  dept text,
  linkedin text,
  email text,
  email_status text,
  sursa text not null,
  scor integer not null default 0,
  stare text not null default 'nou',
  gasit_de uuid references app_users(id) on delete set null,
  gasit_la timestamptz not null default now(),
  hotarat_de uuid references app_users(id) on delete set null,
  hotarat_la timestamptz,
  contact_id uuid references contacts(id) on delete set null
);
-- Rol de decizie și urmărirea după aprobare (coada „De contactat azi”).
alter table prospectare_candidati add column if not exists prioritate integer;
alter table prospectare_candidati add column if not exists eticheta text;
alter table prospectare_candidati add column if not exists responsabil_id uuid references app_users(id) on delete set null;
alter table prospectare_candidati add column if not exists stadiu text not null default 'de_contactat';
alter table prospectare_candidati add column if not exists urmator_pas_la date;
alter table prospectare_candidati add column if not exists contactat_la timestamptz;
alter table prospectare_candidati add column if not exists nr_atingeri integer not null default 0;
create index if not exists prospectare_candidati_coada_idx on prospectare_candidati (org_id, stadiu, urmator_pas_la) where stare = 'aprobat';
do $$ begin
  alter table prospectare_candidati add constraint prospectare_candidati_stare_chk check (stare in ('nou', 'aprobat', 'respins'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table prospectare_candidati add constraint prospectare_candidati_stadiu_chk check (stadiu in ('de_contactat', 'contactat', 'raspuns', 'inchis'));
exception when duplicate_object then null; end $$;
create unique index if not exists prospectare_candidati_unic on prospectare_candidati (company_id, nume_norm);
create index if not exists prospectare_candidati_org_idx on prospectare_candidati (org_id, company_id, stare);

create table if not exists prospectare_jurnal (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  provider text not null,
  operatie text not null,
  ok boolean not null default true,
  unitati integer not null default 1,
  company_id uuid references companies(id) on delete set null,
  user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists prospectare_jurnal_org_idx on prospectare_jurnal (org_id, created_at desc);

create table if not exists prospectare_suprimati (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  tip text not null,
  valoare text not null,
  motiv text,
  created_at timestamptz not null default now(),
  unique (org_id, tip, valoare)
);

grant select, insert, update, delete on prospectare_chei to app_user;
grant select, insert, update, delete on prospectare_candidati to app_user;
-- Jurnalul primește și rânduri de „rezervare” (operatie = 'rezervare'), create la începutul unei căutări și șterse când se scriu apelurile reale:
-- două căutări simultane nu mai pot depăși împreună limita zilnică.
grant select, insert, delete on prospectare_jurnal to app_user;
grant select, insert, delete on prospectare_suprimati to app_user;

-- Izolare pe organizație (RLS forțat). Fără app.current_org_id setat nu se vede nimic.
alter table prospectare_chei enable row level security;
alter table prospectare_chei force row level security;
drop policy if exists prospectare_chei_tenant_isolation on prospectare_chei;
create policy prospectare_chei_tenant_isolation on prospectare_chei
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
alter table prospectare_candidati enable row level security;
alter table prospectare_candidati force row level security;
drop policy if exists prospectare_candidati_tenant_isolation on prospectare_candidati;
create policy prospectare_candidati_tenant_isolation on prospectare_candidati
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
alter table prospectare_jurnal enable row level security;
alter table prospectare_jurnal force row level security;
drop policy if exists prospectare_jurnal_tenant_isolation on prospectare_jurnal;
create policy prospectare_jurnal_tenant_isolation on prospectare_jurnal
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
alter table prospectare_suprimati enable row level security;
alter table prospectare_suprimati force row level security;
drop policy if exists prospectare_suprimati_tenant_isolation on prospectare_suprimati;
create policy prospectare_suprimati_tenant_isolation on prospectare_suprimati
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
