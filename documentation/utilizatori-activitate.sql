-- Activitatea utilizatorilor (Panou platformă → Utilizatori): prima autentificare, ultima vizită în CRM și ultima acțiune. Aditiv și idempotent;
-- aplicat cu scripts/aplica-utilizatori-activitate.mjs (rol migrator). Nu schimbă politicile RLS: app_users_self_update permite deja utilizatorului să-și actualizeze propriul rând.
--
--   first_login_at  = prima autentificare (setată o singură dată, la login). Conturile mai vechi rămân null: panoul arată data creării contului, marcată ca estimare.
--   last_seen_at    = ultima pagină din CRM deschisă (scris cel mult o dată la 5 minute).
--   last_action_at  = ultima acțiune făcută în CRM (salvare, import, căutare...), scris cel mult o dată la 5 minute.
alter table app_users add column if not exists first_login_at timestamptz;
alter table app_users add column if not exists last_seen_at timestamptz;
alter table app_users add column if not exists last_action_at timestamptz;
