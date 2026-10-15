-- Performanța reclamelor: costuri de reclame (import CSV sau API), legarea campaniilor publicitare de codurile UTM, contextul de atribuire al fiecărei donații
-- și istoricul linkurilor UTM generate. Aditiv și idempotent; aplicat cu scripts/aplica-reclame.mjs. RLS: izolare pe organizație (vezi scripts/restore-rls.mjs).

-- Un rând = cheltuiala unei reclame într-o zi (granularitatea cea mai fină disponibilă); cheile goale înseamnă „nespecificat la această sursă”.
create table if not exists reclame_costuri (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  platforma text not null,                       -- meta | tiktok | linkedin | google | altele
  ziua date not null,                            -- ziua în fusul contului publicitar, așa cum o raportează sursa
  cont text not null default '',
  campanie_cheie text not null default '',       -- id-ul campaniei de la platformă (altfel numele)
  campanie_nume text not null default '',
  set_cheie text not null default '',
  set_nume text not null default '',
  reclama_cheie text not null default '',
  reclama_nume text not null default '',
  plasament text not null default '',            -- ex. facebook / instagram, dacă sursa îl dă
  moneda text not null default 'RON',
  cheltuiala_minor bigint not null,              -- în moneda originală, în subunități (bani)
  curs_ron numeric(14,6) not null default 1,     -- cursul folosit la import (1 pentru RON), păstrat pentru istoric
  cheltuiala_ron_minor bigint not null,          -- cheltuiala convertită în lei, în bani
  afisari bigint,
  clicuri_link bigint,
  sursa text not null default 'import',          -- import | api
  lot_id uuid,
  actualizat_la timestamptz not null default now()
);
create unique index if not exists reclame_costuri_cheie_uniq on reclame_costuri (org_id, platforma, ziua, cont, campanie_cheie, set_cheie, reclama_cheie, plasament);
create index if not exists reclame_costuri_org_zi_idx on reclame_costuri (org_id, ziua);

-- Legătura dintre campania de la platformă și codul UTM folosit în linkuri (utm_campaign); fără ea, cheltuiala rămâne „nealocată”.
create table if not exists reclame_campanii (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  platforma text not null,
  campanie_cheie text not null,
  campanie_nume text not null default '',
  utm_campanie text,                             -- cod neutru, ex. cmp_026; null = nelegată
  creat_la timestamptz not null default now()
);
create unique index if not exists reclame_campanii_uniq on reclame_campanii (org_id, platforma, campanie_cheie);
create index if not exists reclame_campanii_utm_idx on reclame_campanii (org_id, utm_campanie);

-- Istoricul importurilor de costuri (fișier, perioadă, rânduri), ca să se știe de unde vine fiecare dată.
create table if not exists reclame_importuri (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  platforma text not null,
  nume_fisier text,
  randuri integer not null,
  de_la date,
  pana_la date,
  moneda text not null default 'RON',
  curs_ron numeric(14,6) not null default 1,
  total_ron_minor bigint not null default 0,
  creat_de uuid references app_users(id) on delete set null,
  creat_la timestamptz not null default now()
);
create index if not exists reclame_importuri_org_idx on reclame_importuri (org_id, creat_la desc);

-- Contextul de atribuire al unei donații, fixat la crearea ei (înainte de trimiterea la procesator): ultimul clic eligibil observat.
-- Donația se numără în rapoarte doar când e confirmată de webhook; acest rând doar spune de unde a venit.
create table if not exists donatie_atribuiri (
  donatie_id uuid primary key references fundraising_donations(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  clasa text not null,                           -- platita | organica | email | alta
  platforma text,                                -- meta | tiktok | linkedin | google | altele (doar pentru clasa platita)
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  click_la timestamptz,                          -- momentul clicului/vizitei eligibile (din browser, validat)
  consimtamant text not null default 'fara-stocare', -- analytics-acordat | fara-stocare
  model text not null default 'ultim-clic-v1',
  creat_la timestamptz not null default now()
);
create index if not exists donatie_atribuiri_org_idx on donatie_atribuiri (org_id, clasa, creat_la desc);
create index if not exists donatie_atribuiri_campanie_idx on donatie_atribuiri (org_id, utm_campaign);

-- Istoricul linkurilor UTM generate (convenții consecvente, ușor de regăsit).
create table if not exists reclame_linkuri (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  url text not null,
  utm_source text not null,
  utm_medium text not null,
  utm_campaign text not null,
  utm_content text,
  eticheta text,
  creat_de uuid references app_users(id) on delete set null,
  creat_la timestamptz not null default now()
);
create index if not exists reclame_linkuri_org_idx on reclame_linkuri (org_id, creat_la desc);

grant select, insert, update, delete on reclame_costuri to app_user;
grant select, insert, update, delete on reclame_campanii to app_user;
grant select, insert, update, delete on reclame_importuri to app_user;
grant select, insert, update, delete on donatie_atribuiri to app_user;
grant select, insert, update, delete on reclame_linkuri to app_user;

-- Conexiune de citire către o platformă de reclame (acum: Meta). Tokenul e criptat (AES-256-GCM, ORG_SECRETS_KEY) și nu pleacă niciodată spre browser.
-- Modulul doar citește costuri; nu modifică bugete și nu pornește sau oprește reclame.
create table if not exists reclame_conexiuni (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  platforma text not null,
  cont_id text not null,                          -- id-ul contului publicitar, fără prefixul act_
  cont_nume text,
  moneda text,
  fus_orar text,
  token_enc text not null,
  curs_manual numeric(14,6),                      -- pentru monede diferite de RON/EUR; EUR folosește cursul zilei dacă nu e setat
  stare text not null default 'activ',            -- activ | necesita-reconectare | eroare
  ultima_eroare text,
  ultima_sincronizare timestamptz,                -- ultima încercare
  ultima_reusita timestamptz,                     -- ultima sincronizare încheiată cu succes
  randuri_ultima integer,
  de_la date,
  pana_la date,
  sincronizare_pornita_la timestamptz,            -- blocaj ca două sincronizări să nu ruleze deodată pe același cont
  creat_de uuid references app_users(id) on delete set null,
  creat_la timestamptz not null default now()
);
create unique index if not exists reclame_conexiuni_uniq on reclame_conexiuni (org_id, platforma);
grant select, insert, update, delete on reclame_conexiuni to app_user;
