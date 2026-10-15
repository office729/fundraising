-- Feedback de la utilizatorii platformei: chestionarul de satisfacție (NPS) și sugestiile. Aditiv și idempotent; aplicat cu scripts/aplica-feedback.mjs.
-- Fiecare rând aparține unei organizații (org_id) și e vizibil membrilor ei; echipa platformei citește și răspunde peste toate organizațiile
-- prin politica feedback_platforma_admin (GUC app.platform_admin, setat doar de rutele gardate cu isPlatformAdmin).
create table if not exists feedback_platforma (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references app_users(id) on delete set null,
  tip text not null, -- chestionar | sugestie
  -- chestionar
  nps smallint,
  satisfactie smallint,
  note jsonb not null default '{}'::jsonb,
  module jsonb not null default '[]'::jsonb,
  ce_place text,
  ce_lipseste text,
  -- sugestie
  categorie text,
  titlu text,
  mesaj text,
  -- comun
  poate_contacta boolean not null default false,
  stare text not null default 'nou',
  raspuns text,
  raspuns_la timestamptz,
  raspuns_de text,
  created_at timestamptz not null default now()
);
create index if not exists feedback_platforma_org_idx on feedback_platforma (org_id, tip, created_at desc);
create index if not exists feedback_platforma_tip_idx on feedback_platforma (tip, created_at desc);

-- Organizația citește și adaugă; modificările (stare, răspuns) le face doar echipa platformei.
grant select, insert, update on feedback_platforma to app_user;
