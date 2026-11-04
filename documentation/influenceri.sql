-- Influenceri (pachetul IMPACT): baza de creatori de conținut pe care îi rogi să distribuie campaniile organizației, cu fișă, linkuri unice, istoric și rezultate.
-- Aditiv și idempotent; aplicat cu scripts/aplica-influenceri.mjs (rol migrator). Regulile sunt în src/lib/influenceri/reguli.ts.
--
-- Principii de protecție a datelor:
--  * doar date publice și profesionale, cu sursa și temeiul legal notate pe fișă; nimic nu se trimite automat, „trimis” se marchează doar de colegă;
--  * ștergerea la cerere elimină fișa, istoricul și numele din descrierea linkurilor; rămân doar amprentele (hash) cheilor de excludere, ca profilul să nu fie readăugat;
--  * linkul unic (/r/<campanie>-i<cod aleator>) nu conține numele influencerului, iar clicurile se numără pe zi, fără IP, browser sau alt identificator.
--
-- influenceri: fișa influencerului. Coloanele *_norm sunt forma normalizată a handle-ului / id-ului / emailului (profile.php?id=…, /channel/… recunoscute), cu index unic pe organizație.
-- influenceri_activitati: istoricul fișei = jurnal de audit (cine, ce, când).
-- influenceri_linkuri: câte un link unic pentru fiecare combinație influencer × campanie × platformă; influencer_id devine null la ștergerea la cerere.
-- influenceri_clicuri: clicuri pe zi pentru fiecare link (doar numărul).
-- influenceri_excluderi: amprente (sha-256 cu organizația în intrare) ale handle-urilor și emailurilor care nu mai trebuie readăugate.
create table if not exists influenceri (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  nume text,
  nume_public text not null,
  foto_url text,
  facebook text,
  instagram text,
  tiktok text,
  youtube text,
  facebook_norm text,
  instagram_norm text,
  tiktok_norm text,
  youtube_norm text,
  email_norm text,
  urmaritori jsonb not null default '{}'::jsonb,
  categorie text not null default 'lifestyle',
  domeniu text,
  public_tinta text,
  oras text,
  judet text,
  tara text not null default 'România',
  email text,
  telefon text,
  sursa_date text not null default 'manual',
  temei_legal text not null default 'interes legitim — profil public, contact profesional',
  responsabil_id uuid references app_users(id) on delete set null,
  etapa text not null default 'identificat',
  caz_id uuid references fundraising_pages(id) on delete set null,
  note text,
  nu_contacta boolean not null default false,
  nu_contacta_motiv text,
  ultima_contactare timestamptz,
  ultimul_raspuns timestamptz,
  follow_up_la timestamptz,
  follow_up_tip text,
  follow_up_nota text,
  nr_reveniri integer not null default 0 check (nr_reveniri >= 0),
  acord_public boolean not null default false,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists influenceri_instagram_unic on influenceri (org_id, instagram_norm) where instagram_norm is not null;
create unique index if not exists influenceri_facebook_unic on influenceri (org_id, facebook_norm) where facebook_norm is not null;
create unique index if not exists influenceri_tiktok_unic on influenceri (org_id, tiktok_norm) where tiktok_norm is not null;
create unique index if not exists influenceri_youtube_unic on influenceri (org_id, youtube_norm) where youtube_norm is not null;
create unique index if not exists influenceri_email_unic on influenceri (org_id, email_norm) where email_norm is not null;
create index if not exists influenceri_etapa_idx on influenceri (org_id, etapa);
create index if not exists influenceri_responsabil_idx on influenceri (org_id, responsabil_id);
create index if not exists influenceri_followup_idx on influenceri (org_id, follow_up_la) where follow_up_la is not null;
create index if not exists influenceri_creat_idx on influenceri (org_id, created_by, created_at);
create index if not exists influenceri_judet_idx on influenceri (org_id, judet);

create table if not exists influenceri_activitati (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  influencer_id uuid not null references influenceri(id) on delete cascade,
  tip text not null,
  canal text,
  text text,
  caz_id uuid references fundraising_pages(id) on delete set null,
  user_id uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists influenceri_activitati_inf_idx on influenceri_activitati (influencer_id, created_at desc);
create index if not exists influenceri_activitati_org_idx on influenceri_activitati (org_id, tip, created_at);

create table if not exists influenceri_linkuri (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  influencer_id uuid references influenceri(id) on delete set null,
  caz_id uuid not null references fundraising_pages(id) on delete cascade,
  slug text not null,
  platforma text not null,
  descriere text,
  created_by uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists influenceri_linkuri_slug_unic on influenceri_linkuri (slug);
create unique index if not exists influenceri_linkuri_inf_unic on influenceri_linkuri (influencer_id, caz_id, platforma) where influencer_id is not null;
create index if not exists influenceri_linkuri_org_idx on influenceri_linkuri (org_id, caz_id);

create table if not exists influenceri_clicuri (
  link_id uuid not null references influenceri_linkuri(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  ziua date not null,
  nr integer not null default 0,
  primary key (link_id, ziua)
);
create index if not exists influenceri_clicuri_org_idx on influenceri_clicuri (org_id, ziua);

create table if not exists influenceri_excluderi (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  amprenta text not null,
  motiv text not null default 'stergere',
  created_at timestamptz not null default now(),
  unique (org_id, amprenta)
);

grant select, insert, update, delete on influenceri to app_user;
-- Jurnalul se șterge doar odată cu ștergerea la cerere a fișei.
grant select, insert, delete on influenceri_activitati to app_user;
grant select, insert, update on influenceri_linkuri to app_user;
grant select, insert, update on influenceri_clicuri to app_user;
grant select, insert on influenceri_excluderi to app_user;

-- Izolare pe organizație (RLS forțat). Fără app.current_org_id setat nu se vede nimic.
alter table influenceri enable row level security;
alter table influenceri force row level security;
drop policy if exists influenceri_tenant_isolation on influenceri;
create policy influenceri_tenant_isolation on influenceri
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
alter table influenceri_activitati enable row level security;
alter table influenceri_activitati force row level security;
drop policy if exists influenceri_activitati_tenant_isolation on influenceri_activitati;
create policy influenceri_activitati_tenant_isolation on influenceri_activitati
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
alter table influenceri_linkuri enable row level security;
alter table influenceri_linkuri force row level security;
drop policy if exists influenceri_linkuri_tenant_isolation on influenceri_linkuri;
create policy influenceri_linkuri_tenant_isolation on influenceri_linkuri
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
alter table influenceri_clicuri enable row level security;
alter table influenceri_clicuri force row level security;
drop policy if exists influenceri_clicuri_tenant_isolation on influenceri_clicuri;
create policy influenceri_clicuri_tenant_isolation on influenceri_clicuri
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
alter table influenceri_excluderi enable row level security;
alter table influenceri_excluderi force row level security;
drop policy if exists influenceri_excluderi_tenant_isolation on influenceri_excluderi;
create policy influenceri_excluderi_tenant_isolation on influenceri_excluderi
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);

-- Ruta publică /r/<cod> (fără sesiune): găsește linkul după cod și numără clicul, în contextul de încredere app.public_lookup.
-- Linkul nu conține date despre persoană (doar codul, organizația, campania și platforma); interogările din rută au predicat explicit pe cod / link_id.
drop policy if exists influenceri_linkuri_public_lookup on influenceri_linkuri;
create policy influenceri_linkuri_public_lookup on influenceri_linkuri for select
  using (nullif(current_setting('app.public_lookup', true), '') = 'true');
drop policy if exists influenceri_clicuri_public_lookup on influenceri_clicuri;
create policy influenceri_clicuri_public_lookup on influenceri_clicuri for all
  using (nullif(current_setting('app.public_lookup', true), '') = 'true')
  with check (nullif(current_setting('app.public_lookup', true), '') = 'true');
