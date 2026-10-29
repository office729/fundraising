-- Provenința vizitatorilor și rezultatele campaniilor: evenimentele pe paginile publice (campanii de strângere de fonduri, Formular 230, site-ul platformei)
-- și instantaneul de atribuire al fiecărei conversii (donație, formular 230 trimis, lead, cont creat). Aditiv și idempotent; aplicat cu scripts/aplica-atribuire.mjs.
-- Regulile de clasificare și modelele de atribuire: documentation/atribuire.md.
--
-- RLS: rândurile unei organizații se văd doar în contextul ei (app.current_org_id). Rândurile fără organizație (org_id null) sunt ale site-ului platformei:
-- le scrie doar acțiunea publică după validare (app.atribuire_site) și le citește/șterge doar echipa platformei (app.platform_admin).

-- Un rând = un eveniment al unui vizitator. Cu acordul pentru statistici, vizitator_id și sesiune_id sunt UUID-uri pseudonime generate în browser; fără acord
-- sunt o amprentă care se schimbă zilnic (HMAC din IP + browser + ziua), deci permit numărarea pe zi, nu urmărirea între zile (persistent = false).
-- Clasificarea provenienței (sursa, canalul, tipul promovării, metoda) se calculează pe server și se repetă pe fiecare eveniment al sesiunii.
create table if not exists atrib_evenimente (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  flux text not null,                       -- campanie | f230 | sponsorizare20 | platforma
  tip text not null,                        -- vizita | click_doneaza | start_donatie | start_formular | lead | inscriere_pornita
  page_id uuid references fundraising_pages(id) on delete cascade,
  beneficiar_id uuid references formular230_beneficiari(id) on delete set null,
  vizitator_id text not null,
  persistent boolean not null default false,
  sesiune_id text not null,
  sursa text not null,
  canal text not null,
  tip_promovare text not null,              -- organic | platit | nedeterminat
  metoda text not null,                     -- utm | identificator_reclame | referrer | necunoscut
  campanie_marketing text,                  -- utm_campaign (promovarea), nu id-ul campaniei de strângere de fonduri
  continut text,                            -- utm_content: postarea, reclama, varianta de mesaj sau linkul
  termen text,
  utm_id text,
  ad_click_tip text,
  ad_click_id text,
  referrer_host text,
  cale text,
  dispozitiv text not null default 'desktop',
  la timestamptz not null default now(),
  ziua date not null
);
create index if not exists atrib_evenimente_org_ziua_idx on atrib_evenimente (org_id, ziua);
create index if not exists atrib_evenimente_vizitator_idx on atrib_evenimente (org_id, vizitator_id, la);
create index if not exists atrib_evenimente_page_ziua_idx on atrib_evenimente (page_id, ziua);
create index if not exists atrib_evenimente_ziua_idx on atrib_evenimente (ziua);

-- Instantaneul de atribuire al unei conversii, salvat în clipa conversiei și neschimbat de vizitele ulterioare.
-- Rezultatul real (donație confirmată, rambursată, suma) se citește mereu din tabelul operațional al conversiei; aici e doar proveniența.
create table if not exists atrib_conversii (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  tip text not null,                        -- donatie | f230 | lead | cont
  entitate_id uuid not null,                -- id-ul donației / formularului / lead-ului / organizației create
  flux text not null,
  page_id uuid,
  beneficiar_id uuid,
  vizitator_id text,
  sesiune_id text,
  persistent boolean not null default false,
  consimtamant text not null default 'fara-stocare',   -- acord-statistici | fara-stocare
  model text not null,
  fereastra_zile integer not null,
  conversie_la timestamptz not null default now(),
  prima_sursa text, prima_canal text, prima_tip text, prima_metoda text, prima_campanie text, prima_continut text, prima_la timestamptz,
  ses_sursa text, ses_canal text, ses_tip text, ses_metoda text, ses_campanie text, ses_continut text,
  ult_sursa text, ult_canal text, ult_tip text, ult_metoda text, ult_campanie text, ult_continut text, ult_la timestamptz,
  creat_la timestamptz not null default now()
);
create unique index if not exists atrib_conversii_entitate_uniq on atrib_conversii (tip, entitate_id);
create index if not exists atrib_conversii_org_idx on atrib_conversii (org_id, tip, conversie_la);
create index if not exists atrib_conversii_page_idx on atrib_conversii (org_id, page_id);
create index if not exists atrib_conversii_vizitator_idx on atrib_conversii (org_id, vizitator_id);

grant select, insert, update, delete on atrib_evenimente to app_user;
grant select, insert, update, delete on atrib_conversii to app_user;
