# Fundraising Academy

Platformă SaaS multi-tenant: ONG-urile își fac cont și primesc acces la un
set de instrumente de fundraising (CRM PJ, CRM PF, rapoarte, șabloane,
generator de contract de sponsorizare), pe bază de abonament lunar.

Vezi planul de arhitectură complet pentru context și fazare.

## Stare curentă: Faza 0 — Fundație

Ce există: schema de bază (organizations/memberships/app_users), autentificare
Supabase, izolare de tenant prin RLS (`set_config` transacțional, NU query-uri
globale), flux de signup (cont → organizație nouă → owner) și login, un
Control Tower gol care listează instrumentele (fără acces real la ele încă).

Ce NU există încă: niciun instrument portat (CRM PJ/PF, rapoarte etc.),
billing Stripe, invitații de echipă.

## Setup local (necesită acțiune manuală — nu poate fi automatizat de aici)

1. **Creează un proiect Supabase nou** (separat de cel al SOI_CRM). Din
   Project Settings → API, copiază URL-ul și cheia publishable în `.env.local`
   (pornește de la `.env.example`).
2. **Rulează `documentation/rls-setup.sql`** în SQL Editor-ul acelui proiect
   — creează rolurile `migrator`/`app_user` și politicile RLS. Notează
   parolele generate.
3. Completează `DATABASE_URL` (rolul `app_user`) și `MIGRATOR_DATABASE_URL`
   (rolul `migrator`) în `.env.local`.
4. `npm install`
5. `npm run db:push` (folosește `MIGRATOR_DATABASE_URL` din `drizzle.config.ts`)
   ca să creeze tabelele din schemă.
6. Re-rulează secțiunea 2-3 din `rls-setup.sql` dacă ai adăugat tabele noi
   după primul push (FORCE RLS + politici nu se creează automat de Drizzle).
7. `npm run dev`

### Verificare de izolare (obligatorie înainte de a considera Faza 0 gata)

Vezi secțiunea 5 din `documentation/rls-setup.sql` — creează 2 conturi de
test cu 2 organizații separate și confirmă manual că un query fără
`app.current_org_id` setat întoarce 0 rânduri, iar cu el setat la org A vezi
DOAR datele din org A.

### Ce mai trebuie făcut manual, în afara acestui repo

- ✅ Repo GitHub creat și urcat: **`github.com/office729/fundraising`** (2026-09-04).
  Pe un laptop nou: `git clone https://github.com/office729/fundraising.git`.
- Creat proiect Vercel legat de acel repo, cu variabilele de mediu de mai sus.
- Creat cont/produse Stripe (test + live) — necesar abia din Faza 1.
- Confirmat maparea pachet → instrumente din `lib/billing/packages.ts`
  (momentan e un strawman din planul aprobat) și prețurile lunare.
