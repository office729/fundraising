-- Notificări pe e-mail oprite de utilizator (acum: rezumatul săptămânal al calendarului de fundraising). Per utilizator, nu per organizație:
-- cine se dezabonează nu mai primește rezumatul pentru nicio organizație. Aditiv și idempotent; aplicat cu scripts/aplica-notificari-oprite.mjs.
-- Citit și scris din rute publice (link semnat din e-mail), din „Contul meu” și din cron, toate cu predicat explicit pe user_id, în contextul app.public_lookup.
create table if not exists notificari_oprite (
  user_id uuid not null references app_users(id) on delete cascade,
  tip text not null,
  creat_la timestamptz not null default now(),
  primary key (user_id, tip)
);
grant select, insert, delete on notificari_oprite to app_user;
