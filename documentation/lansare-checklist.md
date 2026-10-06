# Lista de lansare — ce trebuie făcut de tine (nu poate fi făcut din cod)

Stare la 6 octombrie 2026, după auditul complet și loturile 1–5 de corecturi. Tot ce ține de cod a fost rezolvat sau
documentat în `audit-complet-2026-10-06.md`; mai jos rămân doar lucrurile care cer chei, conturi, decizii sau acțiuni la tine.

## 1. Înainte de prima organizație plătitoare (obligatoriu)

1. **Criptează cele 2 CNP-uri rămase în clar** (organizația `salveaza-o-inima`, probabil teste):
   `node --env-file=.env.local scripts/cripteaza-cnp-existente.mjs`
   apoi, în Supabase SQL Editor: `alter table formular230_submissions validate constraint f230_cnp_criptat;`
   (Alternativ, dacă sunt doar teste: le ștergi din Formular 230.)
2. **Variabile în Vercel (Production):**
   - `NETOPIA_ENV=live` + cheile live Netopia (după verificarea contului). Până atunci rămâne sandbox și facturile fiscale NU se emit.
   - `OBLIO_CIF` = CIF-ul MEDIGROUPPLUS SRL (factura se emite pe firma corectă).
   - `NEXT_PUBLIC_SITE_URL=https://alexandrit.ro` (linkurile din emailuri; fără ea se folosește oricum alexandrit.ro).
   - `CRON_SECRET`, `ORG_SECRETS_KEY` (vezi pct. 3), `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` (proiect Sentry pe regiunea **UE**),
     `ALERTE_FACTURARE_EMAIL` (cine primește alertele de storno / reînnoiri).
3. **Copie de siguranță a `ORG_SECRETS_KEY`** în managerul de parole. Fără ea, cheile Stripe ale organizațiilor, tokenurile de card
   și CNP-urile criptate devin definitiv ilizibile. Adaugă o a doua copie offline.
4. **Supabase:**
   - Planul Pro (sau cel puțin activarea backup-urilor/PITR) și un test de restaurare.
   - Auth → „Leaked password protection" (există doar pe Pro).
   - Auth → „Confirm email" activ; Site URL și Redirect URLs fără wildcard-uri.
   - Verifică că regiunea proiectului e aproape de Vercel (`dub1`, Dublin) — fiecare interogare plătește latența.
5. **Webhook-ul Stripe al fiecărui ONG:** URL-ul din Setări → Plăți donații conține acum ID-ul organizației (nu se mai strică la
   redenumire). Organizațiile care l-au configurat deja cu slug pot păstra URL-ul vechi (merge), dar redenumirea adresei lor e blocată
   cât timp au Stripe conectat.
6. **Curățenie în baza live (cere acordul tău, e ștergere definitivă):** organizațiile de test (`[TEST AUTOMAT]` ×3, `test-andrei`, `az`,
   `nume-organizatie`, `calm-impact-demo`, eventual `test` după ce ai terminat testele), conturile `app_users` fără apartenență, conturile
   `auth.users` fără `app_users`, plățile `in_asteptare` vechi din 30.09, cele 5 companii șterse logic din `salveaza-o-inima`, cele 6 chei
   `crm_kv` cu prefix `soi-plan2-test`. În organizația `test`: șterge tokenul de card Netopia sandbox și oprește reînnoirea automată.
7. **Plățile de test facturate din greșeală** (Oblio 0007–0009): storno cu contabilul.

## 2. Monitorizare (recomandat înainte de lansare)

- Monitor de uptime (de ex. UptimeRobot) pe `https://alexandrit.ro/api/health` (răspunde 200 `{"ok":true}` sau 503).
- Alerte Sentry pe etichetele `netopia-*`, `stripe-*`, `oblio-*`, `cron-*`, `gdpr-*`. Mesajele noi: „taxare blocată: există o comandă de
  reînnoire nelămurită" (verifică în Netopia dacă plata a trecut) și „N reînnoiri au eșuat tehnic".
- Source maps în Sentry cer un token de autentificare Sentry (`SENTRY_AUTH_TOKEN`) și `withSentryConfig` — nu l-am activat fără token.

## 3. Procese operaționale (rămân manuale, trebuie făcute la timp)

- **Ștergerea la 90 de zile de la expirare** (promisă în Politica de confidențialitate): cron-ul trimite avertizările (60/83 zile) și raportează
  în Sentry organizațiile „peste termen"; ștergerea o faci tu (Setări → Date și ștergerea organizației, ca owner, sau din baza de date).
  Datele contabile (arhiva `platform_payments_arhiva`) se păstrează.
- **Cereri GDPR ale persoanelor** (Setări → Cereri GDPR; profilul donatorului; pagina „Contul meu" `/cont` pentru conturile de utilizator).
- **Storno Oblio** la rambursări: alerta ajunge pe `ALERTE_FACTURARE_EMAIL`; emiterea e manuală, cu contabilul.

## 4. Decizii de produs rămase

- **Plata anuală** („2 luni gratuite"): scoasă din site (nu se putea plăti — checkout-ul taxează o lună). Implementarea cere `luni: 12`,
  preț = 10 × lunar și reînnoire anuală în cron; de decis dacă o vrei.
- **Proratarea la schimbarea pachetului** la mijlocul perioadei (azi: plătești noul pachet, perioada se prelungește cu o lună peste cea rămasă).
- **Cote promise, dar încă neaplicate pe server:** rapoarte companii / lună, one-pager, generări AI lunare din planul personalizat.
  (Accesul la instrumente e verificat în pagini, dar nu în fiecare acțiune.)
- **CAPTCHA** (Cloudflare Turnstile) pe donații, creare pagină, Formular 230 și înscriere — cere un cont Cloudflare și două chei.
- **Verificare juridică** a textelor (dosarul `dosar-verificare-juridica.docx`). Textele au fost aliniate cu comportamentul real la audit
  (anual scos, reînnoire „dacă banca permite", export JSON, Sentry / Google Fonts / cdnjs listate, grație de 14 zile implementată), dar
  rămân neverificate de un jurist.

## 5. Întărire după lansare (nu blochează)

- Politici RLS prea largi (apărare în adâncime): `memberships_insert_self`, `invites_token_update`, `organizations_update_admin`,
  `fundraising_donations_public_select` / `fundraising_pages_public_select` (cer teste RLS cu bază de date; azi izolarea se bazează și pe
  `WHERE org_id` din cod, verificat peste tot).
- `crm_kv`: ultima scriere câștigă (două persoane editează același document) — cere modificări în instrumentele din iframe.
- Aplicarea politicilor RLS în `restore-rls.mjs` nu actualizează politici existente (`create` fără `drop`).
- Două istorii de migrații (repo vs. baza live) — documentat în `migrari-si-teste.md`.
