-- Verificarea publică a certificatelor și sursa de marketing a donațiilor. Aditiv; aplicat cu scripts/aplica-verificari-surse.mjs.
-- Politicile RLS sunt în scripts/restore-rls.mjs (certificate_verificari_*).

-- Sursa donației: etichetă din parametrii utm_* ai linkului pe care a ajuns donatorul (ex. „newsletter|email|campania-x”).
-- Nu e dată personală (o etichetă de campanie) și nu se păstrează nimic pe dispozitivul donatorului: se citește din adresa paginii la trimitere.
alter table fundraising_donations add column if not exists sursa_marketing text;

-- Certificatele emise primesc un cod public; pagina /v/<cod> arată doar ce e pe certificat (destinatar, titlu, dată, număr, emitent).
create table if not exists certificate_verificari (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  cod text not null unique,
  destinatar text not null,
  titlu text not null,
  data_emitere date not null,
  numar text,
  org_nume text not null,
  org_slug text not null,
  revocat boolean not null default false,
  creat_de uuid references app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists certificate_verificari_org_idx on certificate_verificari (org_id, created_at desc);

alter table certificate_verificari enable row level security;
alter table certificate_verificari force row level security;
