-- Igiena datelor donatorilor și dovada acordului de e-mail. Aditiv și idempotent; aplicat cu scripts/aplica-donatori-igiena.mjs.
--
-- 1) donatori_reali: data, sursa și versiunea textului acordului de e-mail (art. 7(1) GDPR: operatorul trebuie să poată dovedi acordul).
--    NULL la acordurile dinaintea acestor coloane. sursa: formular_online (donatorul a bifat singur) | declarat_echipa (bifat de un om din organizație).
-- 2) dubluri_respinse: grupurile de donatori marcate „Nu sunt aceeași persoană”, ca să nu fie propuse din nou.
alter table donatori_reali add column if not exists consimtamant_email_la timestamptz;
alter table donatori_reali add column if not exists consimtamant_email_sursa text;
alter table donatori_reali add column if not exists consimtamant_email_versiune text;
alter table donatori_reali drop constraint if exists donatori_reali_acord_sursa_chk;
alter table donatori_reali add constraint donatori_reali_acord_sursa_chk check (consimtamant_email_sursa is null or consimtamant_email_sursa in ('formular_online', 'declarat_echipa'));

create table if not exists dubluri_respinse (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  -- ID-urile donatorilor din grup, sortate și unite cu virgulă: dacă în grup apare un donator nou, semnătura se schimbă și grupul e propus din nou.
  semnatura text not null,
  respins_la timestamptz not null default now(),
  respins_de uuid references app_users(id) on delete set null
);
create unique index if not exists dubluri_respinse_org_semnatura on dubluri_respinse (org_id, semnatura);

grant select, insert, delete on dubluri_respinse to app_user;
alter table dubluri_respinse enable row level security;
alter table dubluri_respinse force row level security;
drop policy if exists dubluri_respinse_tenant_isolation on dubluri_respinse;
create policy dubluri_respinse_tenant_isolation on dubluri_respinse
  using (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid)
  with check (org_id = nullif(current_setting('app.current_org_id', true), '')::uuid);
