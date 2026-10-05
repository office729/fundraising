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

## Cheia ORG_SECRETS_KEY — backup și pierdere (adăugat 2026-10-05)

`ORG_SECRETS_KEY` criptează cheile Stripe ale ONG-urilor, tokenurile cardurilor (Netopia), CNP-urile din Formular 230 și
semnează linkurile de dezabonare și lista de suprimare a emailurilor. Nu are rotație (doar prefixul `v1.`), deci:

- **Păstreaz-o în DOUĂ locuri**: variabilele Vercel (Production) ȘI un manager de parole al firmei. Fără copie, o ștergere
  accidentală din Vercel înseamnă pierdere definitivă a datelor criptate.
- **Nu o schimba** după ce există date criptate: cheile deja salvate devin ilizibile și toate webhook-urile Stripe răspund 500.
- Dacă se pierde: organizațiile trebuie să-și reintroducă cheile Stripe (Setări → Plăți donații), cardurile salvate se pierd
  (clienții plătesc din nou), iar CNP-urile deja criptate nu mai pot fi citite. Linkurile de dezabonare deja trimise nu mai
  validează, iar lista de suprimare (HMAC) nu mai poate fi potrivită cu adresele — se reconstruiește doar din cereri noi.
- Rotația ar cere un script de re-criptare (decriptare cu cheia veche, criptare cu cea nouă, într-o tranzacție) — nu există încă.

## Jurnalul Drizzle: ordinea `when` (de verificat înainte de un mediu nou)

În `src/lib/db/migrations/meta/_journal.json`, `0000_baseline.when` (1789991561468) este MAI MARE decât
`0001_netopia_stripe_org.when` (1789990428254). Migratorul Drizzle aplică doar migrările cu `when` mai mare decât ultima
aplicată, deci pe o bază „baseline-ată" din acest jurnal migrarea 0001 ar fi SĂRITĂ. Producția are deja obiectele (a fost
construită cu `push`), deci nu e afectată. La crearea unui mediu nou (staging / recuperare după dezastru), verifică dacă
baseline-ul include deja tabelele din 0001; dacă nu, corectează `when` înainte de `db:migrate`.
