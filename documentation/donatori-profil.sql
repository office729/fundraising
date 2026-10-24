-- Fișa donatorului 360° și igiena adreselor de e-mail. Aditiv și idempotent; aplicat cu scripts/aplica-donatori-profil.mjs.
--
-- donatori_reali:
--   email_stare: ok | respins (serverul de e-mail a răspuns clar că adresa nu există) | reclamat (a marcat un mesaj ca spam). Doar „ok” primește mesaje automate.
--   email_stare_la / email_stare_motiv: când și de ce (motivul e o frază scurtă, fără textul serverului).
--   frecventa_email: normala | rara („mai rar”: cel mult un mesaj de parcurs la 30 de zile), aleasă de donator pe pagina „Cât de des vrei mesaje”.
-- donator_notite: tip (nota | apel | intalnire | email) și rezultat (la apeluri), ca fișa să arate și apelurile.
alter table donatori_reali add column if not exists email_stare text not null default 'ok';
alter table donatori_reali add column if not exists email_stare_la timestamptz;
alter table donatori_reali add column if not exists email_stare_motiv text;
alter table donatori_reali add column if not exists frecventa_email text not null default 'normala';
alter table donatori_reali add column if not exists frecventa_email_la timestamptz;
alter table donatori_reali drop constraint if exists donatori_reali_email_stare_chk;
alter table donatori_reali add constraint donatori_reali_email_stare_chk check (email_stare in ('ok', 'respins', 'reclamat'));
alter table donatori_reali drop constraint if exists donatori_reali_frecventa_email_chk;
alter table donatori_reali add constraint donatori_reali_frecventa_email_chk check (frecventa_email in ('normala', 'rara'));

alter table donator_notite add column if not exists tip text not null default 'nota';
alter table donator_notite add column if not exists rezultat text;
alter table donator_notite drop constraint if exists donator_notite_tip_chk;
alter table donator_notite add constraint donator_notite_tip_chk check (tip in ('nota', 'apel', 'intalnire', 'email'));
