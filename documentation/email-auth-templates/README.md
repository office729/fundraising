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

## 2. Expeditorul (Authentication → Emails → SMTP Settings → Enable custom SMTP)

Folosește aceeași găzduire de email ca pentru facturi:
- Sender email: `no-reply@alexandrit.ro` (creează cutia în cPanel; sau folosește `vlad.placinta@alexandrit.ro`)
- Sender name: `Alexandrit`
- Host: `mail.alexandrit.ro`
- Port: `465`
- Username / Password: ale cutiei alese (parola nu se pune în repo)

Fără SMTP propriu Supabase limitează trimiterea la câteva emailuri pe oră și le trimite de pe domeniul lui (ajung mai des în Spam).

## 3. Verificare
Creează un cont de test, verifică: expeditorul „Alexandrit", subiectul în română, butonul verde, linkul duce la alexandrit.ro.
