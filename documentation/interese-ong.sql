-- Lista de lead-uri: ONG-urile care completează formularul „Descoperă Alexandrit” (pop-up și pagina /descopera) de pe site-ul public. Aditiv și idempotent;
-- aplicat cu scripts/aplica-interese-ong.mjs. Tabelul e al platformei (nu aparține unei organizații): îl scrie formularul public și îl citește doar echipa platformei.
--
-- O adresă de e-mail apare o singură dată (unicitate pe adresa cu litere mici): o nouă completare cu aceeași adresă actualizează rândul și crește nr_trimiteri.
-- Acces: formularul public lucrează cu GUC app.interes_site = 'true' (setat doar în acțiunea serverului, după validare și limitarea cererilor);
-- echipa platformei lucrează cu app.platform_admin = 'true' (rute gardate cu isPlatformAdmin).
create table if not exists interese_ong (
  id uuid primary key default gen_random_uuid(),
  nume text not null,
  organizatie text not null,
  email text not null,
  telefon text,
  cale text,
  campanie text,
  stare text not null default 'nou',
  notita text,
  nr_trimiteri integer not null default 1,
  creat_la timestamptz not null default now(),
  ultima_trimitere_la timestamptz not null default now(),
  actualizat_la timestamptz,
  actualizat_de text
);
create unique index if not exists interese_ong_email_unic on interese_ong (lower(email));
create index if not exists interese_ong_stare_idx on interese_ong (stare, creat_la desc);
do $$ begin
  alter table interese_ong add constraint interese_ong_stare_chk check (stare in ('nou', 'contactat', 'in_discutie', 'inscris', 'pierdut'));
exception when duplicate_object then null; end $$;

grant select, insert, update, delete on interese_ong to app_user;

alter table interese_ong enable row level security;
alter table interese_ong force row level security;
drop policy if exists interese_ong_site on interese_ong;
create policy interese_ong_site on interese_ong
  using (nullif(current_setting('app.interes_site', true), '') = 'true')
  with check (nullif(current_setting('app.interes_site', true), '') = 'true');
drop policy if exists interese_ong_admin on interese_ong;
create policy interese_ong_admin on interese_ong
  using (nullif(current_setting('app.platform_admin', true), '') = 'true')
  with check (nullif(current_setting('app.platform_admin', true), '') = 'true');
