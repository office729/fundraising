-- Utilizatori suplimentari peste pachetul START (15 lei/lună fiecare): cât are organizația acum și cât a cuprins fiecare comandă.
-- Aditiv și idempotent; valoarea implicită 0 = comportamentul de până acum. Nu schimbă politicile RLS (sunt pe rând, nu pe coloană).
alter table organizations add column if not exists extra_users integer not null default 0;
alter table platform_payments add column if not exists extra_users integer not null default 0;
