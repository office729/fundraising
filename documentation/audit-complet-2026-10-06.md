# Audit complet Alexandrit — 6 octombrie 2026

Metodă: 7 agenți independenți, doar citire (securitate, plăți/facturare, date/DB, bug-uri, accesibilitate/SEO/UX, conformitate text↔cod, fiabilitate/operare) + verificări directe pe site-ul live (headere, endpoint-uri, DNS, Lighthouse). Peste 150 de constatări brute; mai jos sunt deduplicate și ordonate. Nimic nu a fost modificat în timpul auditului.

Legendă certitudine: **V** = verificat de mine direct (live/DNS/cod); **C** = confirmat de agent din cod; **P** = probabil (depinde de configurație externă sau de comportamentul unui serviciu).

---

## A. De rezolvat primele (impact mare, remediu mic)

| # | Problemă | Unde | Cert. |
|---|---|---|---|
| A1 | **Adresa unui domeniu inexistent are drept de platform-admin.** `vlad.placinta@fundrasingacademy.ro` e în allowlist; domeniul nu există în DNS și poate fi cumpărat. Cine îl înregistrează își face cont cu acea adresă și intră în `/platform-admin` (listează toți clienții, modifică pachet/status/perioadă pe orice organizație, ocolește paywall, limita AI și blocarea trimiterii în masă). Fix: scoate adresa; mută lista în variabilă de mediu; validează input-ul din `ajusteazaOrgAction`. | `src/lib/billing/trial.ts:10-15`, `src/app/platform-admin/actions.ts` | **V** |
| A2 | **`/signup?plan=start\|crestere\|impact\|custom` face org-ul „plătit" fără plată** (`package` ≠ `trial`). Efect: trimitere în masă către voluntari (până la 1000/zi, de pe expeditorul platformei = releu de spam), 300 generări AI/zi în loc de 30 (cost Anthropic), cote mari la `custom`. Fix: creează mereu cu `trial`, plan dorit în coloană separată; „plătit" = `status=active` și `currentPeriodEnd>now`. | `lib/billing/plan-from-form.ts`, `lib/auth/provizionare.ts:79`, `voluntari-send/route.ts:66-91`, `lib/ai-limit.ts:21` | C (2 agenți) |
| A3 | **CNP în clar în baza live** (2 rânduri, `salveaza-o-inima`, probabil teste). Codul nou criptează; nu există backfill nici CHECK. Fix: șterge rândurile de test sau criptează-le, apoi `CHECK (cnp like 'v1.%')`. | `formular230_submissions.cnp` | C (DB live) |
| A4 | **Facturi și atașamente de task în bucket PUBLIC** (`org-branding`, listabil); URL permanent; la ștergerea facturii fișierul rămâne. Fix: bucket privat + URL semnat; șterge fișierul odată cu rândul. | `crm/strangere-fonduri/invoice-actions.ts:57-70`, `task-actions.ts` | C (2 agenți) |
| A5 | **Webhook-ul Stripe e legat de slug-ul organizației (editabil)** și donațiile se acceptă fără `webhookSecret`. După redenumire, Stripe primește 400, donațiile rămân `in_asteptare`, fără alertă, fără reconciliere. Fix: URL cu id imutabil; refuză crearea plății fără webhook secret; blochează/avertizează la schimbarea slug-ului cât e Stripe conectat; cron de reconciliere. | `api/stripe/webhook/[orgSlug]`, `setari/actions.ts:154-186`, `[pageSlug]/actions.ts:123-132` | C (3 agenți) |
| A6 | **Apelurile Twilio din CRM nu pot funcționa**: `Permissions-Policy: microphone=()` și lipsa domeniilor Twilio din `connect-src`. Fix: `microphone=(self)`; `https://*.twilio.com wss://*.twilio.com` în CSP. | `next.config.ts:24-31,47` | C (2 agenți) |
| A7 | **`robots.txt`, `sitemap.xml`, `/.well-known/*` și orice URL inexistent redirecționează (307) la `/login`**; paginile 404 nu există (nu există `not-found.tsx`, `error.tsx`, `global-error.tsx`). Fix: `robots.ts` + `sitemap.ts`, excepții în proxy, pagini de eroare RO/EN. | `src/proxy.ts`, `src/lib/supabase/session.ts` | **V** |
| A8 | **Semnătura din Formularul 230 e invizibilă în dark mode** (canvas `bg-canvas`, cerneală `#111827`) și **un simplu tap produce „semnătură" transparentă acceptată de server**. Fix: canvas alb fix; validare `hasInk` + pixeli minimi pe server. | `f230/[orgSlug]/formular-client.tsx`, `api/[orgSlug]/formular230/.../route.ts:78` | C |
| A9 | **Oferta anuală („490 lei/an, 2 luni gratuite") e afișată implicit pe /hub, dar checkout-ul taxează o singură lună** (`luni: 1`; parametrul `billing` se pierde). Fix: implementezi anualul sau scoți toggle-ul și textul din hub/picker/Termeni §5. | `hub/plans-section.tsx`, `lib/billing/netopia-checkout.ts:56`, `plan-query.ts` | C |
| A10 | **Reînnoirea automată Netopia: risc de dublă taxare** (cron rulat de două ori / răspuns pierdut → după 36h retaxare) **și eșecuri fără nicio alertă** (`catch {}` gol, cron mereu 200, fără `maxDuration`, taxarea după pașii auxiliari, `fetch` fără timeout). Fix: re-verificare sub lock + orderId determinist per perioadă; alerte Sentry + monitor de cron; `AbortSignal.timeout`; taxarea primul pas. | `lib/billing/netopia-checkout.ts:174-261`, `api/cron/netopia-reinnoire/route.ts` | C / P |

## B. GDPR și conformitate (text promis ≠ comportament)

- **B1.** Ștergerea la 90 de zile e promisă (GDPR, DPA, email), dar cron-ul doar avertizează; nu șterge nimic. Conturile de utilizator (`app_users`, `auth.users`) nu se șterg niciodată, iar ~30 de FK spre `app_users` sunt NO ACTION (art. 17 nu poate fi onorat pentru membrii echipei). Live: 7 `app_users` fără apartenență, 14 `auth.users` fără `app_users`. **C**
- **B2.** Ștergerea GDPR a unui donator nu anulează abonamentul Stripe recurent; la următorul `invoice.paid` datele revin din metadata. **C (2 agenți)**
- **B3.** `formular230_destinatari`, `fundraising_beneficiary_invites`, `fundraising_campaign_agents`, `invites`, `angajati`, `apeluri` nu sunt acoperite de căutare/export/ștergere GDPR; donațiile `in_asteptare`/`esuata` ale unei persoane fără `donatori_reali` nu pot fi găsite. **C**
- **B4.** Emailurile în masă către voluntari nu au link de dezabonare, List-Unsubscribe sau verificare `email_suppression`, deși textele spun că platforma le oferă. **C**
- **B5.** GA4 rulează și pe `/dezabonare` (URL cu email în base64), `/f230`, `/strangere-fonduri`, `/invite` și trimite `page_location`; notele de donator/F230 nu menționează Google. **C**
- **B6.** Terți încărcați fără acord în zona autentificată și în instrumente (Google Fonts, cdnjs) și Sentry — nelistați în Politică/DPA; politica spune „nu se trimite nimic către Google". Cookie-urile `fa_locale`, `canva_pkce_verifier`, localStorage-ul instrumentelor lipsesc din tabel. **C**
- **B7.** Formularul „Creează pagină" trimite la Politica platformei (care spune că platforma nu e operator), fără nota de informare cu operator = ONG; povestea poate conține date de sănătate/minori. **C**
- **B8.** Termeni §6 promit suspendare „după 14 zile", codul blochează imediat; §5 „reînnoire automată" absolutizat vs „dacă banca permite"; fără clauză de retragere/ANPC; link SOL/ANPC din footer rupt sau depășit; `TERMENI_VERSIUNE` (2026-10-02) ≠ data afișată (5 oct). **C**
- **B9.** Newsletter-ele au subsolul „Asociația salvează o inimă" hardcodat pentru toate organizațiile (39 + 60 apariții). **P**
- **B10.** Automatismul cron F230 e pornit de platformă pentru toate organizațiile, nu „de Operator" (DPA §2). **P**
- **B11.** `Permissions-Policy`, `Secure` pe cookie-uri, cookie-ul de sesiune devine persistent la refresh deși „Rămâi conectat" e debifat. **P**

## C. Plăți și facturare (restul)

- Org nou poate reseta proba la infinit: șterge org-ul + creează altul; plus-addressing; fără registru persistent. **C**
- Schimbarea de pachet cu perioadă rămasă nu e proratată (2 luni IMPACT la ~58% din preț). **C**
- Cote vândute dar neaplicate: rapoarte companii/lună, one-pager, generări AI din planul custom; `orgHasToolAccess` doar în pagini, nu în acțiuni. **C**
- Plata manuală reactivează în tăcere reînnoirea automată oprită de client. **C**
- `ntpId` nu se salvează la plata interactivă (UPDATE în altă tranzacție vede 0 rânduri) → fallback-ul de status e mort. **C**
- Ștergerea organizației șterge în cascadă `platform_payments` (evidență contabilă) și jurnalele de audit. **C**
- Contorizare greșită a eșecurilor de reînnoire (dublare IPN + răspuns sincron). **C**
- `startCheckoutAction` nu validează `pkg`; reducerea de recomandare fără protecție la auto-recomandare; CIF „squatting"; Oblio: fără claim în DB, coadă care poate înfometa; data facturii în UTC; chei Stripe de test acceptate. **C / P**
- Rambursare parțială Netopia = o lună întreagă retrasă; donație offline fără idempotență sau reversare. **P / C**

## D. Date și bază de date

- RLS: activ și FORCE pe toate cele 55 de tabele; `anon`/`authenticated` fără drepturi; izolarea e **solidă pe live**. Slăbiciuni de apărare în adâncime: `fundraising_donations_public_select` / `fundraising_pages_public_select` (PII cross-tenant dacă un query uită `org_id`), `memberships_insert_self` fără restricție de rol/organizație, `invites_token_update` pe toate coloanele, `organizations_update_admin` fără restricție pe coloanele de facturare. **C**
- Drift: `organizations.dpa_accepted_by` (FK doar live), `fundraising_updates.data` (default doar live); două istorii de migrații (repo 0000–0010 vs 19 live); `restore-rls.mjs` nu conține `auth_rate_limits_all` și `formular230_member_update` (după un push, UPDATE pe F230 eșuează tăcut); `rls-setup.sql` învechit (78 vs 137 politici); `restore-rls` nu poate actualiza politici existente (`create` fără `drop`). **C**
- `fundraising_donations.page_id → fundraising_pages` e `ON DELETE CASCADE` (ștergerea unei campanii șterge donațiile rambursate/eșuate/pending). **C**
- Storage: bucket `campanii` neutilizat; `org-financial-docs` nu există live (funcția de rapoarte companii ar eșua la upload); scriptul `setup-storage-financiar.mjs` ar deschide balanțele oricărui utilizator autentificat dacă e rulat. **C**
- Date de test în live: organizații `[TEST AUTOMAT]` ×3, `test-andrei`, `az`, `nume-organizatie`, `calm-impact-demo`, `test` (token card Netopia sandbox cu auto-renew), 10 `platform_payments` `in_asteptare` vechi, 5 companii soft-șterse, obiect Storage orfan. **C**
- Unicități/CHECK lipsă (payment intent, `lower(email)`, sume ≥ 0); contoare denormalizate consistente azi, fără reconciliere. **C**
- Advisori: `auth_leaked_password_protection` oprit (Supabase Pro); performanță: 131 `auth_rls_initplan`, 280 `multiple_permissive_policies`, 56 FK fără index (volume mici acum). **C**

## E. Bug-uri funcționale

- React 19 golește câmpurile necontrolate la orice eroare returnată de acțiune (25 de formulare: donație, signup, login, creare campanie — la „Povestea e prea lungă" se pierde tot textul). **C**
- Google/Apple Pay: rândul apare chiar dacă metoda nu se poate randa → modal fără buton de plată. **C**
- Import CSV de firme: nu detectează `;`, sparge câmpurile cu newline, „1.234,56" devine 123456, UTF-8 forțat. Suma din contractul de sponsorizare pierde zecimalele („1.500,50" → 150.050). **C**
- Fusuri orare: perioadele KPI și „azi/lună/an", anul formularului la 1 ianuarie, ora afișată în UTC și mismatch de hidratare pe 3 componente. **C**
- Pierdere de scrieri concurente: `logKpi` (document `kpi_log` rescris), `crm-kv` (ultima scriere câștigă, până la 2 MB). **C**
- Contor „N donații" plafonat la 20 pe pagina publică; istoric KPI trunchiat înainte de filtrare; apel Twilio rămâne activ la navigare; invitații duplicate consumă cota. **C**
- RFM, Comunicare, Taskuri rulează pe date demo fără banner; importul din meniul „Adaugă" scrie doar în localStorage. **C**
- Slug schimbat → linkuri externe rupte (`/f230/<slug>`, campanii, emailuri); beneficiar vs membru pe același email se blochează reciproc. **C / P**
- Mesaje de eroare din acțiuni server hardcodate în română; paginile publice `f230`, `dezabonare`, `finalize-form`, `beneficiar` fără locale; 104 `"ro-RO"` hardcodate. **C**
- Parametri URL invalizi dau 500 (`an=abc`, `limit=abc`, date inexistente); validări de enum lipsă în acțiuni apelabile direct; mass-assignment în `organizatie/actions.ts` și `kpi/atribuiri-actions.ts`. **C**

## F. Accesibilitate, SEO, UX

- Lighthouse mobil (live): Accessibility 92–96, SEO 91–92, Best-practices 100, Performance 89–93 (înainte de ultimele optimizări; ulterior 0,96 pe paginile de marketing).
- Contrast insuficient în tema light: text alb pe `brand-green` (3,01:1) la toate butoanele CTA; `text-muted-2` 3,47:1; footer `white/40` 3,71:1. În dark mode (OS dark), CTA alb pe verde/albastru pastel = 2,07–2,2:1. **C**
- Aceeași meta description pe toate paginile; fără canonical/OG/Twitter, fără `metadataBase`; pagina de campanie fără `og:image` deși are imagine. **C**
- Heading h1→h3 pe `/premii`; formulare publice fără `autocomplete` și erori fără `role="alert"`; F230 pe mobil cu câmpuri de 125 px și text de 14 px; culoarea butonului F230 din `brandColor` fără garanție de contrast. **C**
- Dialog CRM fără focus trap/restore, `SidePanel` fără Esc și cu butoane tabbable ascunse, dropdown-uri fără semantică de tastatură, bannerul de cookie-uri (`z-[9999]`) acoperă modalul de donație. **C**
- Linkuri de footer: „Program Training" duce la `/`; `anpc.ro/ce-este-sal/` 404; link SOL depășit. Pagini „în curând" (`/blog`, `/studii-de-caz`) indexabile și în topbar; `/login`, `/signup` indexabile. **C**
- Țintele tactile sub 24–44 px în topbar/footer; modalul de donație se închide la click în afară (pierde datele); câmpul „Suma" devine 0 dacă e șters. **C**
- Marketing: „9 instrumente" vs 10 în cod; „Asociația Nectarios" vs „Fundația Nektarios"; „100 ONG-uri — obiectiv" afișat în același rând cu cifre realizate. **C / P**

## G. Fiabilitate și operare

- `ORG_SECRETS_KEY` e punct unic de eșec (cripteaza chei Stripe, tokenuri Netopia/Canva, CNP) și e folosită și ca HMAC pentru lista de suprimare GDPR; fără rotație, fără canar de verificare. Fix: cheie HMAC separată, format cu key-id, backup confirmat. **C**
- `npm audit --omit=dev`: 1 HIGH (`source-map-js` ≤1.2.1, doar la build) → pasul de CI pică; fix `npm audit fix`. `xlsx` din CDN SheetJS (cu hash în lockfile). `next` 16.3.6 → 16.3.8 disponibil. **C**
- Conexiuni DB imbricate (`ai-limit`/`rate-limit` pe `db` global în timpul unei tranzacții `ctx.db`) și apeluri externe (SMTP, Canva, BoldSign, Stripe, Netopia) în interiorul tranzacțiilor pe un pool de 5 → risc de epuizare sub încărcare. **C**
- Observabilitate: fără `global-error.tsx`, fără source maps (`withSentryConfig`), fără `release`, fără `/api/health`, fără monitor de cron; PII în URL-urile din Sentry (`/dezabonare?e=…`, `/invite/<token>`). **C**
- Fără niciun test automat; CI nu rulează `next build`, `test:rls` sau verificarea `gen:tools`; fără procedură documentată de rollback/backup/restaurare; jurnalul Drizzle cu `when` inversat. **C**
- `voluntari-send`: până la 500 de emailuri secvențial fără deadline/dedupe; vizualizarea unui raport consumă cota AI zilnică; export limitat la 4 MB / 50.000 rânduri cu tabele omise integral. **C**
- `NEXT_PUBLIC_SITE_URL` cu fallback către `fundraising-academy-one.vercel.app` în cron-uri; `NETOPIA_ENV` greșit scris trece tacit pe sandbox. **C**
- Fără CAPTCHA pe donații, creare pagină, Formular 230 (card testing pe contul Stripe al ONG-ului; CNP fără cifră de control). **C**

## H. Ce este solid (verificat)

Webhook-uri Stripe/Netopia/Twilio cu semnături corecte și idempotență; cron-uri cu `timingSafeEqual`; prețuri calculate pe server; izolare de tenant prin RLS FORCE pe toate tabelele; fără IDOR cross-tenant, SQL injection sau XSS găsite; nicio funcție `"use server"` nu expune `ctx`; criptare CNP AES-256-GCM; dezabonare cu HMAC și RFC 8058; GA doar după acord; i18n RO/EN cu chei identice în cele 40 de dicționare; `tsc` fără erori; antete de securitate, HSTS preload, redirecturi http/www corecte; modalul de donație cu focus trap și Esc; fără imagini fără `alt`.

## Ordine propusă de lucru

1. **Azi (mici, sigure):** A1, A6, A7, A8, scoaterea domeniului inexistent, `npm audit fix`, CSP/Permissions-Policy, linkuri de footer, `aria`/`autocomplete`, pagini de eroare, contrast.
2. **Săptămâna aceasta:** A2, A3, A4, A5, A10 (+ alerte și monitor de cron), B4, B5, B7, ștergere GDPR completă (B1–B3), `ORG_SECRETS_KEY` (cheie HMAC separată).
3. **Decizii de produs necesare:** anual sau nu (A9); politica de ștergere la 90 de zile (automat vs manual, B1); grație 14 zile la expirare (B8); proratare la schimbarea pachetului; cote pe rapoarte/one-pager/AI.
4. **După:** RLS în adâncime, drift migrații, teste automate + CI cu `next build`, formularele care își păstrează valorile la eroare, fusuri orare KPI, conflicte de scriere `crm-kv`/KPI.
