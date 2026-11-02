# Zoom: linkuri create automat pentru programări

Fiecare programare (făcută de vizitator sau de echipă din Panou platformă → Programări → „Programează un înscris”) primește o întâlnire Zoom proprie,
cu sală de așteptare. Linkul se salvează în programare (câmpul „locație”), apare în emailul de confirmare, pe pagina personală a programării și în fișierul
de calendar. Când programarea se anulează, întâlnirea Zoom se șterge.

Fără configurare, platforma folosește linkul fix din „Tipuri de întâlniri” (câmpul „Locul sau linkul întâlnirii”). Nimic nu se strică dacă Zoom nu răspunde:
programarea rămâne valabilă, cu linkul fix, iar eroarea se raportează.

## Conectare (o singură dată, de proprietarul contului Zoom)

1. Cont Zoom cu licență (Pro sau mai sus; contul gratuit limitează ședințele la 40 de minute).
2. Intră pe https://marketplace.zoom.us → **Develop** → **Build App** → **Server-to-Server OAuth App**. Dă-i un nume (de exemplu „Alexandrit programări”).
3. La **Scopes** adaugă: `meeting:write:meeting:admin` și `meeting:delete:meeting:admin` (în varianta nouă, „granular”), sau `meeting:write:admin` (varianta clasică).
4. Activează aplicația (**Activate**). Din pagina **App Credentials** copiezi: *Account ID*, *Client ID*, *Client Secret*.
5. În Vercel (proiectul `fundraising-academy` → Settings → Environment Variables, mediul Production) adaugi:

   | Variabilă | Valoare |
   |---|---|
   | `ZOOM_ACCOUNT_ID` | Account ID |
   | `ZOOM_CLIENT_ID` | Client ID |
   | `ZOOM_CLIENT_SECRET` | Client Secret |
   | `ZOOM_USER` | (opțional) emailul gazdei ședințelor; implicit contul care a creat aplicația |

6. Redeploy (Deployments → ⋯ → Redeploy), ca variabilele să fie citite.
7. Verificare: în Panou platformă → Programări → „Programează un înscris” apare bannerul verde „Zoom e conectat”. Fă o programare de test pe adresa ta.

Secretele nu se pun în cod, nu se trimit în chat și nu se afișează în platformă.

## Ce creează platforma

Întâlnire programată (type 2) la ora programării, cu durata tipului de întâlnire, fusul Europe/Bucharest, sală de așteptare, fără intrare înainte de gazdă,
microfoane oprite la intrare și fără înregistrare automată. Titlul: „<tip întâlnire>: <nume> (<organizație>)”; nota din formular devine agenda ședinței.

## Cine poate programa

Doar contul platformei (aceeași verificare ca în restul Panoului): acțiunile „Programează un înscris” cer `isPlatformAdmin`. Persoana programată primește
confirmarea 1 la 1 (nu e un mesaj trimis în masă), iar echipa nu mai primește emailul „Programare nouă” pentru programările făcute chiar de ea.
