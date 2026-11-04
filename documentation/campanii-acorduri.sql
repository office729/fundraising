-- Acordurile și protecția datelor pe campanie (GDPR): ce campanii pot fi trimise la AI sau către public (Agent email, Influenceri, promovare cu AI).
-- Aditiv și idempotent; nu schimbă politicile RLS (sunt pe rând, nu pe coloană). Toate coloanele pornesc pe false:
--   minor                     beneficiarul este minor
--   acord_distribuire_minor   părintele/tutorele a acceptat distribuirea cazului (contează doar dacă minor = true)
--   anonimizat                cazul este anonimizat: nu se distribuie
--   acord_retras              acordul de distribuire a fost retras: nu se distribuie
--   acord_diagnostic          avem acordul pentru diagnostic și descrierea cazului (fără el, povestea nu pleacă la AI)
-- Atenție: campaniile existente rămân distribuibile (regula veche: activă + acord de publicare), dar povestea lor nu mai pleacă la AI până nu se bifează acordul pentru diagnostic.
alter table fundraising_pages add column if not exists minor boolean not null default false;
alter table fundraising_pages add column if not exists acord_distribuire_minor boolean not null default false;
alter table fundraising_pages add column if not exists anonimizat boolean not null default false;
alter table fundraising_pages add column if not exists acord_retras boolean not null default false;
alter table fundraising_pages add column if not exists acord_diagnostic boolean not null default false;
