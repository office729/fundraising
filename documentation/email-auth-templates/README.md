# Emailuri de autentificare (Supabase Auth)

Aceste șabloane înlocuiesc emailurile implicite Supabase („Confirm your email address", expeditor `noreply@mail.app.supabase.io`).
Se lipesc manual în Supabase Dashboard — nu se aplică din cod.

## 1. Șabloanele (Authentication → Emails → Templates)

| Fișier | Șablon Supabase | Subiect |
|---|---|---|
| 1-confirmare-cont.html | Confirm signup | Confirmă-ți contul Alexandrit |
| 2-resetare-parola.html | Reset password | Resetează-ți parola Alexandrit |
| 3-link-de-autentificare.html | Magic link | Linkul tău de autentificare Alexandrit |
| 4-schimbare-email.html | Change email address | Confirmă schimbarea adresei de email — Alexandrit |
| 5-invitatie.html | Invite user | Ai fost invitat(ă) pe Alexandrit |

Pentru fiecare: deschide șablonul, pune subiectul în „Subject heading", iar în „Message body" lipește conținutul fișierului
(fără prima linie, comentariul cu subiectul). Variabilele `{{ .ConfirmationURL }}` și `{{ .Email }}` le completează Supabase.

## 2. Expeditorul (Authentication → Emails → SMTP Settings) — stare la 2026-10-07

Emailurile de autentificare pleacă acum prin **Resend** (domeniul `alexandrit.ro`, regiunea Ireland/eu-west-1), nu prin căsuța de hosting.
Pe SMTP-ul hostingului ajungeau mereu în Spam (IP partajat, Message-ID lipsă) chiar dacă SPF/DKIM/DMARC treceau.

- Sender email: `no-reply@alexandrit.ro` (nu e nevoie de cutie poștală), Sender name: `Alexandrit`
- Host: `smtp.resend.com`, port `465`, Username: `resend`
- Password: cheia API Resend „Supabase Auth" (Sending access, domeniu alexandrit.ro) — se ține DOAR în Supabase, nu în repo
- DNS adăugat în cPanel: TXT `resend._domainkey`, CNAME `rsend` → `rsend-euw1.forge.rmta.net`, CNAME `send` → `send.forge.rmta.net`.
  NU s-a adăugat MX `@` (doar pentru primire în Resend; ar fi mutat emailul domeniului). Copia zonei de dinainte: `dns-backup-alexandrit.ro-2026-10-07.md` (nu e în repo).
- Facturile și mesajele din platformă (Formular 230, voluntari) rămân pe SMTP-ul hostingului (variabilele `SMTP_*` din Vercel), neschimbate.

Dacă se schimbă cheia Resend: Supabase → SMTP Settings → Password. Resend plan gratuit: 100 emailuri/zi, 3.000/lună.

## 3. Verificare
Verificat 2026-10-07: emailul de resetare parolă a ajuns în Inbox (Gmail). Linkul rămâne pe domeniul supabase.co (custom domain Supabase e plătit).
