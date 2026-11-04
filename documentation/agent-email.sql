-- Agentul email (AI) către companii. Aditiv și idempotent; aplicat cu scripts/aplica-agent-email.mjs (rol migrator). NU se rulează automat.
--
-- Principii:
--  - emailul pleacă DIN CĂSUȚA COLEGULUI (SMTP-ul lui), niciodată dintr-un cont al platformei; răspunsurile se citesc din aceeași căsuță (IMAP);
--  - nimic nu pleacă fără acțiunea explicită a colegului: AI-ul doar scrie ciorne (stare 'ciorna'), omul le aprobă;
--  - parolele căsuțelor sunt criptate cu lib/secret-box.ts (ORG_SECRETS_KEY); în interfață se vede doar amprenta (ultimele caractere).
--
-- agent_email_conturi: căsuța de email a FIECĂRUI utilizator (SMTP pentru trimitere, IMAP pentru răspunsuri) + semnătura lui. Unic pe (organizație, utilizator).
--   Izolarea pe utilizator (fiecare își vede și își folosește doar căsuța) o face aplicația; RLS izolează pe organizație.
-- agent_email_mesaje: ciornele și emailurile trimise. Stări: ciorna -> se_trimite -> trimis | eroare. „se_trimite” = revendicat atomic (update ... where stare = 'ciorna'),
--   deci două clicuri sau două taburi nu trimit de două ori. message_id / in_reply_to / referinte leagă răspunsurile de fir.
-- agent_email_raspunsuri: răspunsurile citite din căsuță, etichetate (interesat / detalii / nu_acum / refuz / alt_contact / stop / automat / altul). Unic pe Message-ID-ul răspunsului.
-- agent_email_pdf: One Pager-ul atașat. company_id null = PDF-ul GENERAL al organizației (încărcat de administrator); altfel PDF-ul firmei. Amprenta (hash) fixează fișierul aprobat la confirmare.
-- agent_email_contor: câte emailuri a trimis un expeditor într-o zi (ora României) — limita zilnică, rezervată atomic înainte de trimitere.
-- agent_email_setari: alegerile organizației (limita pe expeditor / zi, pixelul de deschidere — oprit implicit).

create table if not exists agent_email_conturi (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  adresa text not null,
  semnatura text not null default '',
  smtp_host text not null,
  smtp_port integer not null,
  smtp_user text not null,
  imap_host text not null,
  imap_port integer not null default 993,
  imap_user text not null,
  parola_enc text not null,
  amprenta text not null default '',
  smtp_testat_la timestamptz,
  smtp_eroare text,
  imap_testat_la timestamptz,
  imap_eroare text,
  imap_blocat_pana timestamptz,
  imap_verificat_la timestamptz,
  imap_noi integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists agent_email_conturi_unic on agent_email_conturi (org_id, user_id);

create table if not exists agent_email_mesaje (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,
  firma_nume text not null,
  catre_nume text not null,
  catre_email text not null,
  catre_rol text,
  de_user_id uuid references app_users(id) on delete set null,
  de_nume text not null,
  de_email text not null,
  subiect text not null,
  mesaj text not null,
  subiect_alt text,
  subiect_ales text,
  ai_subiect text,
  ai_mesaj text,
  mecanism text not null default 'sponsorizare',
  caz_page_id uuid references fundraising_pages(id) on delete set null,
  caz_nume text,
  istoric text,
  tip text not null default 'prim',
  revenire_la uuid references agent_email_mesaje(id) on delete set null,
  stare text not null default 'ciorna',
  eroare text,
  creat_de uuid references app_users(id) on delete set null,
  creat_de_nume text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  se_trimite_la timestamptz,
  trimis_la timestamptz,
  aprobat_de uuid references app_users(id) on delete set null,
  aprobat_de_nume text,
  aprobat_la timestamptz,
  message_id text,
  in_reply_to text,
  referinte text,
  pixel text,
  deschis_prima timestamptz,
  deschis_ultima timestamptz,
  deschis_nr integer not null default 0,
  pdf_hash text,
  pdf_nume text,
  salut_ghicit boolean not null default false,
  apel_la timestamptz,
  apel_facut_la timestamptz
);
alter table agent_email_mesaje drop constraint if exists agent_email_mesaje_stare_chk;
alter table agent_email_mesaje add constraint agent_email_mesaje_stare_chk check (stare in ('ciorna', 'se_trimite', 'trimis', 'eroare'));
alter table agent_email_mesaje drop constraint if exists agent_email_mesaje_tip_chk;
alter table agent_email_mesaje add constraint agent_email_mesaje_tip_chk check (tip in ('prim', 'revenire'));
alter table agent_email_mesaje drop constraint if exists agent_email_mesaje_mecanism_chk;
alter table agent_email_mesaje add constraint agent_email_mesaje_mecanism_chk check (mecanism in ('sponsorizare', 'd177', 'caz'));
create unique index if not exists agent_email_mesaje_message_id_unic on agent_email_mesaje (org_id, message_id) where message_id is not null;
create unique index if not exists agent_email_mesaje_pixel_unic on agent_email_mesaje (pixel) where pixel is not null;
create index if not exists agent_email_mesaje_org_stare_idx on agent_email_mesaje (org_id, stare, created_at desc);
create index if not exists agent_email_mesaje_firma_idx on agent_email_mesaje (org_id, company_id, created_at desc);
create index if not exists agent_email_mesaje_expeditor_idx on agent_email_mesaje (org_id, de_user_id, stare);

create table if not exists agent_email_raspunsuri (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  mesaj_id uuid not null references agent_email_mesaje(id) on delete cascade,
  message_id_raspuns text not null,
  de_la text not null,
  primit_la timestamptz not null,
  subiect text not null default '',
  fragment text not null default '',
  eticheta text not null default 'altul',
  automat boolean not null default false,
  citit boolean not null default false,
  created_at timestamptz not null default now()
);
alter table agent_email_raspunsuri drop constraint if exists agent_email_raspunsuri_eticheta_chk;
alter table agent_email_raspunsuri add constraint agent_email_raspunsuri_eticheta_chk check (eticheta in ('interesat', 'detalii', 'nu_acum', 'refuz', 'alt_contact', 'stop', 'automat', 'altul'));
create unique index if not exists agent_email_raspunsuri_unic on agent_email_raspunsuri (org_id, message_id_raspuns);
create index if not exists agent_email_raspunsuri_mesaj_idx on agent_email_raspunsuri (org_id, mesaj_id, primit_la desc);

create table if not exists agent_email_pdf (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  nume text not null,
  continut_b64 text not null,
  marime integer not null,
  hash text not null,
  incarcat_de uuid references app_users(id) on delete set null,
  incarcat_de_nume text,
  created_at timestamptz not null default now()
);
create unique index if not exists agent_email_pdf_general_unic on agent_email_pdf (org_id) where company_id is null;
create unique index if not exists agent_email_pdf_firma_unic on agent_email_pdf (org_id, company_id) where company_id is not null;

create table if not exists agent_email_contor (
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references app_users(id) on delete cascade,
  zi date not null,
  nr integer not null default 0,
  primary key (org_id, user_id, zi)
);

create table if not exists agent_email_setari (
  org_id uuid primary key references organizations(id) on delete cascade,
  limita_zi integer not null default 40,
  pixel_activ boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table agent_email_setari drop constraint if exists agent_email_setari_limita_chk;
alter table agent_email_setari add constraint agent_email_setari_limita_chk check (limita_zi between 1 and 200);

grant select, insert, update, delete on agent_email_conturi to app_user;
grant select, insert, update, delete on agent_email_mesaje to app_user;
grant select, insert, update, delete on agent_email_raspunsuri to app_user;
grant select, insert, update, delete on agent_email_pdf to app_user;
grant select, insert, update, delete on agent_email_contor to app_user;
grant select, insert, update, delete on agent_email_setari to app_user;

-- Izolare pe organizație (RLS forțat). Fără app.current_org_id setat nu se vede nimic.
alter table agent_email_conturi enable row level security;
alter table agent_email_conturi force row level security;
drop policy if exists agent_email_conturi_tenant_isolation on agent_email_conturi;
create policy agent_email_conturi_tenant_isolation on agent_email_conturi
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);

alter table agent_email_mesaje enable row level security;
alter table agent_email_mesaje force row level security;
drop policy if exists agent_email_mesaje_tenant_isolation on agent_email_mesaje;
create policy agent_email_mesaje_tenant_isolation on agent_email_mesaje
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
-- Pixelul de deschidere e apelat de destinatar (fără sesiune, fără organizație): se vede și se actualizează doar rândul cu tokenul din GUC-ul app.agent_pixel.
drop policy if exists agent_email_mesaje_pixel_citire on agent_email_mesaje;
create policy agent_email_mesaje_pixel_citire on agent_email_mesaje for select
  using (pixel is not null and pixel = nullif(current_setting('app.agent_pixel', true), ''));
drop policy if exists agent_email_mesaje_pixel_actualizare on agent_email_mesaje;
create policy agent_email_mesaje_pixel_actualizare on agent_email_mesaje for update
  using (pixel is not null and pixel = nullif(current_setting('app.agent_pixel', true), ''))
  with check (pixel is not null and pixel = nullif(current_setting('app.agent_pixel', true), ''));

alter table agent_email_raspunsuri enable row level security;
alter table agent_email_raspunsuri force row level security;
drop policy if exists agent_email_raspunsuri_tenant_isolation on agent_email_raspunsuri;
create policy agent_email_raspunsuri_tenant_isolation on agent_email_raspunsuri
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);

alter table agent_email_pdf enable row level security;
alter table agent_email_pdf force row level security;
drop policy if exists agent_email_pdf_tenant_isolation on agent_email_pdf;
create policy agent_email_pdf_tenant_isolation on agent_email_pdf
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);

alter table agent_email_contor enable row level security;
alter table agent_email_contor force row level security;
drop policy if exists agent_email_contor_tenant_isolation on agent_email_contor;
create policy agent_email_contor_tenant_isolation on agent_email_contor
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);

alter table agent_email_setari enable row level security;
alter table agent_email_setari force row level security;
drop policy if exists agent_email_setari_tenant_isolation on agent_email_setari;
create policy agent_email_setari_tenant_isolation on agent_email_setari
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
