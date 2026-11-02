# Google Meet automat pentru programări

Fiecare programare (a vizitatorului sau făcută de echipă din Panou platformă → Programări → „Programează un înscris”) primește un link Google Meet unic,
creat prin Google Calendar în contul Google al echipei. Evenimentul e privat, fără invitați (Google nu trimite emailuri): confirmarea cu linkul o trimite Alexandrit.
La anulare, evenimentul se șterge. Un link lipit de mână în „Link întâlnire” are prioritate față de cel automat.

Fără configurare nu se strică nimic: programarea rămâne valabilă, cu linkul fix din „Tipuri de întâlniri” sau cu cel lipit de tine.

## Configurare unică (~15 minute, o face proprietarul contului Google)

1. Deschide https://console.cloud.google.com cu contul Google al cărui calendar vrei să conțină ședințele și creează un proiect nou (de exemplu „Alexandrit programări”).
2. **APIs & Services → Library** → caută „Google Calendar API” → **Enable**.
3. **OAuth consent screen** (în meniul nou: *Google Auth Platform*):
   - tip de utilizator: **External**; nume aplicație „Alexandrit”; emailul tău ca email de suport și de contact;
   - la **Data Access / Scopes** adaugă `https://www.googleapis.com/auth/calendar.events`;
   - la **Audience / Publishing status** apasă **Publish app** (starea „In production”). **Important:** dacă aplicația rămâne în „Testing”, jetonul expiră după 7 zile și conexiunea se întrerupe.
     Aplicația nu e verificată de Google, dar e folosită doar de tine, deci nu e nevoie de verificare.
4. **Credentials → Create credentials → OAuth client ID** → tip **Web application**:
   - la **Authorized redirect URIs** adaugi exact `https://alexandrit.ro/api/google/callback`;
   - după creare copiezi **Client ID** și **Client secret**.
5. În Vercel (proiectul `fundraising-academy` → Settings → Environment Variables, Production) adaugi:

   | Variabilă | Valoare |
   |---|---|
   | `GOOGLE_CLIENT_ID` | Client ID |
   | `GOOGLE_CLIENT_SECRET` | Client secret (bifează *Sensitive*) |

   `ORG_SECRETS_KEY` trebuie să existe deja în Vercel (se folosește și pentru cheile Stripe ale ONG-urilor): cu ea se criptează jetonul Google.
6. **Redeploy** (Deployments → ⋯ → Redeploy).
7. În Panou platformă → Programări → „Programează un înscris” apare butonul **„Conectează Google Meet”**. Îl apeși, alegi contul Google și accepți accesul la Calendar.
   Google poate afișa „Google nu a verificat această aplicație”: **Advanced → Go to Alexandrit (unsafe)** (aplicația e a ta). Revii în platformă cu un mesaj verde.

Secretele nu se pun în cod, nu se trimit în chat și nu se afișează în platformă. Jetonul de acces de lungă durată se salvează criptat (AES-256-GCM) în configurarea programărilor, nu în Vercel.

## Cum funcționează

- Scope-ul cerut: `calendar.events` (creare și ștergere de evenimente) plus `openid email` (ca să afișăm „conectat ca …”).
- Evenimentul: privat, în calendarul principal, cu durata tipului de întâlnire, fusul Europe/Bucharest; tokenul programării stă într-o proprietate privată a evenimentului, ca la anulare să-l găsim fără alte date salvate.
- Meet poate cere gazdei să primească persoana în ședință (invitații externi „cer să intre”): fii online la ora întâlnirii. Din setările Meet poți permite accesul oricui are linkul.
- Dacă Google refuză reîmprospătarea jetonului (acces revocat sau aplicație în „Testing”), conexiunea se scoate singură, se raportează eroarea, iar Panoul cere reconectare; programările continuă cu linkul fix.
- „Deconectează” din Panou oprește crearea automată; programările existente își păstrează linkurile.
