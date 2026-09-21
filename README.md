# Alexandrit

Platformă SaaS multi-tenant: ONG-urile își fac cont și primesc acces la un
CRM complet și un set de instrumente de fundraising (rapoarte, newsletter,
contracte de sponsorizare/D177, pagini publice de strângere de fonduri cu
donații prin Stripe), pe bază de abonament lunar.

## Stare curentă

Platforma e funcțională de cap la coadă, live la
fundraising-academy-one.vercel.app, cu izolare de tenant prin RLS
(`set_config` transacțional, NU query-uri globale).

Ce există:
- Autentificare Supabase, signup (cont → organizație nouă → owner), login,
  invitații de echipă (cu cotă de utilizatori aplicată per pachet).
- CRM complet: persoane fizice, Formular 230, companii (inclusiv D177/20%),
  beneficiari & proiecte, donații, strângere de fonduri (pagini publice +
  checkout Stripe pentru donatori), panou beneficiari, presă & grupuri
  locale, fonduri & plăți, RFM/segmentare, comunicare, automatizări,
  task-uri, documente, rapoarte.
- Instrumente portate ca pagini standalone: CRM PJ/Prospectare, CRM
  Voluntari, Program de lucru, Împărțire grupuri Facebook, Comunicate,
  Newsletter PF/PJ, One Pager companii, Raport activitate companii.
- Billing real prin Stripe, cu preț dinamic (`price_data`, fără Produse/
  Prețuri pre-create în Dashboard) — atât pentru donațiile de pe paginile
  publice de campanie, cât și pentru abonamentul ONG-ului la platformă
  (checkout + webhook complet: plată reușită, expirare sesiune, reînnoire
  abonament, refund/dispută, anulare/schimbare abonament). Fără cheile
  Stripe reale completate, checkout-ul arată un mesaj grațios ("Plățile nu
  sunt încă activate") în loc să proceseze plăți — vezi mai jos.
- Sistem de referral: link unic per organizație, 50% reducere (o singură
  dată) la primul abonament plătit al organizației recomandate.
- Cote pe pachet (utilizatori/contacte PF/companii PJ) aplicate efectiv la
  inserare, nu doar afișate în UI; acces per instrument aplicat efectiv
  pentru planul personalizat (pachetele fixe includ mereu toate
  instrumentele, diferă doar prin cote).

Ce nu există încă: cont Stripe real (cheile sunt necompletate — singurul
pas care mai lipsește ca plățile să fie efectiv procesate) și facturare
anuală prin checkout (arătată azi doar informativ, fără flux propriu).

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

### Verificare de izolare (recomandată după orice schimbare de schemă/RLS)

Vezi secțiunea 5 din `documentation/rls-setup.sql` — creează 2 conturi de
test cu 2 organizații separate și confirmă manual că un query fără
`app.current_org_id` setat întoarce 0 rânduri, iar cu el setat la org A vezi
DOAR datele din org A.

### Ce mai trebuie făcut manual, în afara acestui repo

- ✅ Repo GitHub creat și urcat: **`github.com/office729/fundraising`** (2026-09-04).
  Pe un laptop nou: `git clone https://github.com/office729/fundraising.git`.
- ✅ Proiect Vercel legat de acel repo, cu variabilele de mediu de mai sus
  (mai puțin Stripe — vezi punctul următor).
- ⬜ **Plăți — două fluxuri separate, fără cont Stripe al platformei:**
  1. *Abonamentele platformei* (49/149/299 lei/lună) se încasează prin **Netopia**.
     De completat în Vercel: `NETOPIA_API_KEY`, `NETOPIA_POS_SIGNATURE`,
     `NETOPIA_PUBLIC_KEY` (PEM al POS-ului, pentru verificarea IPN) și
     `NETOPIA_ENV` (`sandbox` la test, `live` la producție). În contul Netopia,
     URL-ul de notificare (IPN) e `https://<domeniu>/api/netopia/ipn` — îl trimite
     aplicația la fiecare comandă, nu se setează manual. Fiecare plată = o lună de
     acces (nu reînnoire automată); `organizations.current_period_end` decide.
  2. *Donațiile* de pe paginile ONG-urilor se încasează în **contul Stripe al
     fiecărui ONG**: își pune cheia secretă și secretul webhook-ului în Setări →
     Plăți donații, iar webhook-ul lui indică `/api/stripe/webhook/<slug-ul lui>`.
     Cheile se stochează criptate (AES-256-GCM) cu `ORG_SECRETS_KEY` din Vercel.
- ✅ Migrarea `0001_netopia_stripe_org` (coloane Stripe pe `organizations` + tabelul
  `platform_payments`) + politicile RLS din `scripts/restore-rls.mjs` — de aplicat pe
  baza de producție înainte de deploy (`npm run db:migrate`, sau SQL-ul din
  `src/lib/db/migrations/`).
- ✅ Maparea pachet → instrumente din `lib/billing/packages.ts` — pachetele
  fixe (trial/start/creștere/impact) includ toate instrumentele, diferă doar
  prin cote; planul personalizat diferențiază per instrument, aplicat
  efectiv prin `orgHasToolAccess`.
