# Migrări DB, teste RLS, monitorizare

## Migrări versionate (în loc de `db:push`)
- Schema se modifică în `src/lib/db/schema/*`. Apoi: `npm run db:generate` creează un fișier SQL nou în `src/lib/db/migrations/` (se comite în repo, se revizuiește în PR).
- `npm run db:migrate` aplică migrările noi și re-aplică politicile RLS (`db:restore-rls`).
- Politicile RLS încă trăiesc în `scripts/restore-rls.mjs` (un tabel nou cu `org_id` trebuie adăugat acolo — `npm run test:rls` îl prinde dacă lipsește).
- **O singură dată per bază** (producție/staging): baza a fost construită cu `db:push`, deci baseline-ul trebuie marcat ca aplicat, fără a rula SQL-ul lui:
  1. verifică că schema din bază e cea din cod (`npx drizzle-kit push` nu trebuie să propună modificări — anulează dacă propune);
  2. `npm run db:baseline` (previzualizare) apoi `npm run db:baseline -- --apply`.
- `db:push` rămâne doar pentru o bază locală de dezvoltare.

## Teste RLS
`npm run test:rls` — verifică acoperirea RLS a tuturor tabelelor cu `org_id` și izolarea între organizații (crm_kv, organizations). Rulează într-o tranzacție anulată, deci nu lasă date. Necesită `DATABASE_URL`; nu rulează în CI (fără secrete).

## Monitorizare (Sentry)
Activă doar cu `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` în Vercel. Fără date personale (`sendDefaultPii: false`); folosește proiect pe regiunea EU. Nu se încarcă source maps (fără `withSentryConfig`), deci stack trace-urile din producție sunt minificate.

## Notă de securitate
`memberships_insert_self` permite oricărui utilizator autentificat să-și insereze un membership în orice organizație al cărei id îl cunoaște. Aplicația nu expune asta (doar cod server inserează memberships, prin invitații), dar politica ar trebui restrânsă (ex. doar prin funcție/rol dedicat pentru acceptarea invitațiilor).
