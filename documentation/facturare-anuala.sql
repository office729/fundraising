-- Facturare anuală (2 luni gratuite): câte luni acoperă o plată a organizației (1 = lunar, 12 = anual).
-- Aditiv și idempotent; implicit 1 = comportamentul de până acum. Nu schimbă politicile RLS (sunt pe rând, nu pe coloană).
-- platform_payments.luni există deja (cât prelungește fiecare plată accesul).
alter table organizations add column if not exists billing_luni integer not null default 1;
