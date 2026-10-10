-- Termenul unei campanii de strângere de fonduri (opțional). Doar informativ: nu închide singur campania și nu oprește donațiile.
-- Aditiv și idempotent; nu schimbă politicile RLS (sunt pe rând, nu pe coloană).
alter table fundraising_pages add column if not exists termen date;
