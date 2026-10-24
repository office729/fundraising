-- Parcursuri automate pentru donatori (Welcome, Save, Upgrade): configurare per organizație + jurnalul e-mailurilor trimise. Aditiv și idempotent;
-- aplicat cu scripts/aplica-parcursuri.mjs. Un parcurs e oprit până îl pornește un administrator.
--
-- parcursuri_donatori: textele și zilele fiecărui pas (editabile), starea (activ) și momentul activării.
-- parcursuri_trimiteri: câte un rând pe (organizație, parcurs, pas, adresă). Pasul se revendică înainte de trimitere (unicitatea împiedică trimiterile duble),
-- iar rândul se păstrează ca dovadă a ce i s-a trimis fiecărui donator.
create table if not exists parcursuri_donatori (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  cheie text not null,
  activ boolean not null default false,
  activ_din timestamptz,
  pasi jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references app_users(id) on delete set null
);
create unique index if not exists parcursuri_donatori_org_cheie on parcursuri_donatori (org_id, cheie);
alter table parcursuri_donatori drop constraint if exists parcursuri_donatori_cheie_chk;
alter table parcursuri_donatori add constraint parcursuri_donatori_cheie_chk check (cheie in ('welcome', 'save', 'upgrade', 'reactivare'));

create table if not exists parcursuri_trimiteri (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  cheie text not null,
  pas integer not null,
  email text not null,
  donator_id uuid,
  stare text not null default 'in_curs',
  creat_la timestamptz not null default now()
);
create unique index if not exists parcursuri_trimiteri_unic on parcursuri_trimiteri (org_id, cheie, pas, email);
create index if not exists parcursuri_trimiteri_org_idx on parcursuri_trimiteri (org_id, creat_la desc);
create index if not exists parcursuri_trimiteri_email_idx on parcursuri_trimiteri (org_id, email, creat_la desc);
alter table parcursuri_trimiteri drop constraint if exists parcursuri_trimiteri_cheie_chk;
alter table parcursuri_trimiteri add constraint parcursuri_trimiteri_cheie_chk check (cheie in ('welcome', 'save', 'upgrade', 'reactivare'));
do $$ begin
  alter table parcursuri_trimiteri add constraint parcursuri_trimiteri_stare_chk check (stare in ('in_curs', 'trimis'));
exception when duplicate_object then null; end $$;

grant select, insert, update, delete on parcursuri_donatori to app_user;
grant select, insert, update, delete on parcursuri_trimiteri to app_user;

-- Izolare pe organizație (RLS forțat). Fără app.current_org_id setat nu se vede nimic.
alter table parcursuri_donatori enable row level security;
alter table parcursuri_donatori force row level security;
drop policy if exists parcursuri_donatori_tenant_isolation on parcursuri_donatori;
create policy parcursuri_donatori_tenant_isolation on parcursuri_donatori
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
alter table parcursuri_trimiteri enable row level security;
alter table parcursuri_trimiteri force row level security;
drop policy if exists parcursuri_trimiteri_tenant_isolation on parcursuri_trimiteri;
create policy parcursuri_trimiteri_tenant_isolation on parcursuri_trimiteri
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
