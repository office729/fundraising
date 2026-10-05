# Teste manuale rămase (ce nu se poate verifica automat)

Fiecare test: **pași → rezultat așteptat**. Folosește o organizație de probă, nu una reală. Ștergerea unei organizații e definitivă.

## 1. Înscriere cu email (cu confirmare activă în Supabase)
1. Deschide `/signup` într-o fereastră privată. Completează numele organizației, o adresă de email reală a ta, o parolă de minimum 8 caractere și bifează acceptarea Termenilor.
2. Așteptat: ajungi la `/login?confirmare=necesara`. În baza de date **nu** există încă organizație pentru acel email.
3. Deschide emailul de confirmare și apasă linkul.
4. Așteptat: ajungi la „Încă un pas”, cu numele organizației **pre-completat**; planul și codul de recomandare aleși la înscriere (dacă ai venit de pe `/hub?plan=...`) sunt păstrate.
5. Apasă continuă. Așteptat: organizația se creează, intri în CRM, iar pagina Formularul 230 are linkul public funcțional (`/f230/<slug>`).
6. Variante: email de unică folosință (ex. `x@mailinator.com`) → eroare „adresele de unică folosință nu sunt acceptate”; al 4-lea cont creat de același email → „numărul maxim de organizații”.

## 2. Înscriere cu Google
1. Fereastră privată → `/signup` → bifează acceptarea → „Continuă cu Google” cu un cont Google care nu e înscris.
2. Așteptat: ajungi la „Încă un pas”; caseta de acceptare apare **pre-bifată** (cookie scurt `fa_terms`).
3. Creează organizația. Așteptat: contul principal de Formular 230 există (linkul `/f230/<slug>` funcționează).

## 3. Login cu email neconfirmat
1. Creează un cont cu email, dar **nu** apăsa linkul de confirmare. Încearcă să te autentifici.
2. Așteptat: mesaj „Adresa de email nu e confirmată încă…” și butonul „Retrimite emailul de confirmare”.
3. Apasă butonul. Așteptat: „Dacă adresa există, am trimis un email nou”; emailul ajunge. A 4-a apăsare într-o oră → „Prea multe încercări”.

## 4. Invitație în organizație (livrare reală)
1. Într-o organizație cu pachet CREȘTERE sau IMPACT: Echipă → invită o adresă a ta.
2. Așteptat: mesaj „Am trimis invitația și pe email”; emailul „Invitație în … pe Alexandrit” ajunge cu butonul „Acceptă invitația”.
3. Deschide linkul din altă fereastră privată → creează cont/autentifică-te cu acel email → acceptă.
4. Așteptat: în Echipă apar 2 membri. Verifică și versiunea EN a paginii de invitație (comutator RO/EN).

## 5. Roluri: „Părăsește organizația” și scoaterea unui admin
1. Cu contul invitat la pasul 4, invită-l ca **Admin** (sau schimbă invitația în Admin).
2. Din contul Admin: Echipă → butonul „Părăsește organizația” apare doar pe rândul propriu. Apasă → confirmă.
3. Așteptat: pierzi accesul și ajungi la pagina de pornire; ownerul vede doar 1 membru.
4. Repetă cu doi admini: un admin **nu** vede „Scoate” pe celălalt admin; ownerul îl vede.

## 6. Poarta de reacceptare a Termenilor pentru beneficiari
1. Într-o campanie, invită un beneficiar (pagina campaniei → Invită) cu o adresă a ta și creează contul.
2. Pentru a simula un cont vechi: în Supabase SQL, `update app_users set terms_version = null, terms_accepted_at = null where email = '<adresa>'`.
3. Autentifică-te ca beneficiar. Așteptat: ecranul „Am actualizat Termenii…”; după acceptare intri în `/beneficiar` și `terms_version` devine `2026-10-02`.

## 7. Încărcări de fișiere reale
1. Setări → logo; Strângere fonduri → poză de campanie; factură și atașament la o sarcină; newsletter (încărcare imagine).
2. Așteptat: toate reușesc și fișierele se văd public. Dacă vreuna dă eroare, spune-mi imediat (politicile Storage sunt scopate pe organizație).

## 8. Plată reală de abonament (Netopia sandbox) și factură Oblio
1. Pe o organizație **fără** CIF/adresă/județ: Setări → Schimbă planul. Așteptat: formularul de facturare apare, iar pachetele sunt dezactivate până îl salvezi. Un CIF deja folosit de altă organizație → mesaj „Există deja o organizație cu acest CIF”.
2. Salvează datele, alege un pachet, plătește cu cardul de test Netopia (sandbox).
3. Așteptat: acces activ, plata `reusita`, **cardul salvat** (reînnoire automată pornită). **Factura Oblio NU se emite în sandbox** (protecție: facturile fiscale se emit doar cu `NETOPIA_ENV=live`); plata primește marcajul `NEFACTURAT-SANDBOX`. Ca să testezi și Oblio în sandbox, setează temporar `OBLIO_FACTUREAZA_IN_SANDBOX=1` în Vercel (se consumă din limita de 3 documente/lună a planului gratuit și creează documente fiscale reale — doar cu acordul contabilului). Cu `live`, factura se emite și vine emailul; dacă lipsește, se reia automat la rularea zilnică.
4. Rambursare (din panoul Netopia): așteptat — accesul se retrage, reînnoirea automată se oprește, tokenul cardului dispare. Dacă plata avea factură Oblio, primești un email „Rambursare — de stornat factura …” (la `ALERTE_FACTURARE_EMAIL`) și un avertisment în Sentry; **storno-ul se emite manual în Oblio**, cu contabilul (nu se emite automat). Un IPN de rambursare retrimis nu dublează alerta.

## 9. Reînnoire automată: aviz și expirarea cardului
1. Pe organizația de test cu card salvat, mută `current_period_end` la ~3 zile de acum și rulează cron-ul (`/api/cron/netopia-reinnoire` cu `Authorization: Bearer $CRON_SECRET`).
2. Așteptat: ownerul primește emailul „se reînnoiește automat în curând” (data, suma, cardul). A doua rulare în aceeași perioadă **nu** retrimite.
3. Pune `netopia_card_expire_month/year` în trecut și mută perioada la „mâine” → rulează cron-ul. Așteptat: nu se încearcă taxarea, ownerul primește „cardul a expirat”, iar `netopia_renewal_attempts` rămâne 0.

## 10. Campania de reamintire Formular 230 (cu emailuri reale)
1. Într-o organizație de probă, adaugă 2–3 donatori cu adrese **ale tale**, apoi Formularul 230 → „Trimite reamintire”.
2. Așteptat: emailurile ajung (cu link de dezabonare), campania devine „Trimisă pentru <an>”, butonul se dezactivează. Un al doilea click nu trimite din nou.
3. Dezabonează unul dintre donatori din link, șterge-l din profil (GDPR) și recreează-l; așteptat: nu mai primește campania.

## 11. Verificări în Supabase / Vercel (setări, nu cod)
- Authentication → Sign In / Providers → **Confirm email** = activ (verificat: da).
- Variabilă Vercel `OBLIO_CIF` = CIF-ul MEDIGROUPPLUS SRL (de setat).
- Authentication → Attack Protection → parole compromise: disponibil doar pe planul Pro (acum: Free).
- La trecerea Netopia pe live: `NETOPIA_ENV=live`, cheile live și confirmarea Netopia că tokenizarea e activă pe contul live.

## După fiecare test
Șterge organizațiile și utilizatorii de probă (Setări → „Șterge organizația”) și verifică în Sentry că nu au apărut erori noi.

## 12. Retenția: avertizări pentru conturile expirate (valori implicite de confirmat)
Politica implicită: ștergere la **90 de zile** de la expirarea accesului, cu avertizări la **60** și la **83** de zile. Cron-ul zilnic
(`/api/cron/netopia-reinnoire`) trimite emailurile și raportează în Sentry organizațiile peste termen, dar **nu șterge nimic** — ștergerea
rămâne manuală (owner din Setări sau SQL), după confirmare.
1. Pe o organizație de probă cu un owner al tău: în SQL mută `created_at` la ~100 de zile în urmă și lasă `subscription_status` ≠ `active`.
2. Rulează cron-ul cu `CRON_SECRET`. Așteptat: ownerul primește „Datele organizației tale… vor fi șterse în curând”, iar `retentie_avertizari` devine 1
   (a doua rulare nu retrimite). Mută `created_at` la ~125 de zile → a doua avertizare („în 7 zile”), `retentie_avertizari = 2`.
3. Cu accesul expirat, pagina de blocare arată linkul „Descarcă datele organizației (JSON)”, iar descărcarea funcționează pentru owner.
4. Plătește un pachet. Așteptat: accesul revine, iar `retentie_avertizari` se resetează la 0.
