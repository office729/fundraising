-- 2026-10-08 — telefonul de contact al organizației, cerut la înscriere.
-- Aditiv și repetabil. Se rulează în Supabase SQL Editor ÎNAINTE de deploy-ul codului care îl scrie.
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS telefon text;
