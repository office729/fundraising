-- Outreach pe LinkedIn (Waalaxy), pachetul IMPACT. Aditiv și idempotent; aplicat cu scripts/aplica-waalaxy-outreach.mjs.
--
-- 1) contacts: starea de outreach a persoanei (invitat → conectat → a răspuns → refuz; nu se retrogradează), momentul ei, și starea e-mailului după verificare (valid | risky | invalid).
-- 2) outreach_evenimente: jurnalul evenimentelor primite de la Waalaxy prin webhook, DOAR pentru persoane potrivite cu o firmă din CRM. Fără textul mesajelor (doar dacă a fost refuz),
--    ca să nu păstrăm conținutul conversațiilor. „extern_id” e amprenta evenimentului: aceeași încărcătură retrimisă de Waalaxy nu se numără de două ori.
alter table contacts add column if not exists outreach_stare text;
alter table contacts add column if not exists outreach_stare_la timestamptz;
alter table contacts add column if not exists email_status text;
alter table contacts drop constraint if exists contacts_outreach_stare_chk;
alter table contacts add constraint contacts_outreach_stare_chk check (outreach_stare is null or outreach_stare in ('invitat', 'conectat', 'a_raspuns', 'refuz'));
alter table contacts drop constraint if exists contacts_email_status_chk;
alter table contacts add constraint contacts_email_status_chk check (email_status is null or email_status in ('valid', 'risky', 'invalid'));
create index if not exists contacts_outreach_idx on contacts (org_id, outreach_stare, outreach_stare_la) where outreach_stare is not null;

create table if not exists outreach_evenimente (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  contact_id uuid references contacts(id) on delete cascade,
  tip text not null,
  refuz boolean not null default false,
  campanie text,
  extern_id text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists outreach_evenimente_unic on outreach_evenimente (org_id, extern_id);
create index if not exists outreach_evenimente_org_idx on outreach_evenimente (org_id, tip, created_at desc);
create index if not exists outreach_evenimente_contact_idx on outreach_evenimente (contact_id);
alter table outreach_evenimente drop constraint if exists outreach_evenimente_tip_chk;
alter table outreach_evenimente add constraint outreach_evenimente_tip_chk check (tip in ('invitat', 'conectat', 'raspuns'));

grant select, insert, update, delete on outreach_evenimente to app_user;

-- Izolare pe organizație (RLS forțat).
alter table outreach_evenimente enable row level security;
alter table outreach_evenimente force row level security;
drop policy if exists outreach_evenimente_tenant_isolation on outreach_evenimente;
create policy outreach_evenimente_tenant_isolation on outreach_evenimente
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
