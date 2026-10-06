# Prompter — funcționalitățile CRM de fundraising construite într-o săptămână

> Copiază tot textul de mai jos (de la „ROL”) într-un asistent AI de programare (ex. Claude Code) deschis pe codul platformei tale.
> Nu conține integrări cu servicii externe (Waalaxy, Lusha, Apollo, Prospeo, Hunter, Benevity, Make, Newsman etc.) — doar funcționalități interne ale CRM-ului.

---

## ROL

Ești un programator senior care lucrează în codul existent al platformei mele de fundraising (CRM pentru un ONG care strânge bani pentru cazuri medicale: persoane fizice, companii/sponsori, beneficiari/cazuri, KPI pentru echipă). Implementează funcționalitățile de mai jos **adaptându-le la modelul de date, stilul de cod și componentele UI deja existente** în proiect. Nu rescrie ce există; extinde.

## REGULI DE LUCRU

1. Înainte de orice modificare, citește structura proiectului: tabelele (companii, contacte, cazuri, sponsorizări, KPI, interacțiuni), rolurile utilizatorilor (admin / editor / alți), componentele UI comune și felul în care sunt făcute acțiunile pe server.
2. Lucrează **pe etape mici**, fiecare cu: implementare → verificare tipuri/lint/teste → descriere scurtă a ce s-a schimbat. Nu trece la etapa următoare dacă cea curentă nu trece verificările.
3. **Fără migrări de bază de date dacă se poate evita**: preferă câmpuri flexibile existente (ex. o coloană JSON „extra” pe companie) pentru marcaje noi. Dacă e nevoie de o coloană nouă, explică de ce.
4. Interfața în **limba română**, cu diacritice, texte scurte și clare pentru colege ne-tehnice.
5. Totul trebuie să arate bine și pe **telefon** (fără derulare orizontală a paginii).
6. Respectă drepturile: ce e marcat „doar admin” nu apare deloc altor roluri; acțiunile de pe server verifică rolul, nu doar interfața.
7. Căutările după nume să fie **insensibile la diacritice și majuscule** (ex. „morărit” găsește „MORARIT”), inclusiv ș/ş și ț/ţ (cu virgulă și cu sedilă).
8. Nu stoca date personale inutil; respectă regulile GDPR din secțiunea 9.

---

## 1. Lista de companii

**1.1 „Lucrate recent”** — buton pe lista de companii care arată **ultimele 20 de companii la care a lucrat utilizatorul autentificat** (fiecare își vede doar ale lui), ordonate după ultima modificare.

**1.2 Căutare mai bună**
- Insensibilă la diacritice și majuscule (vezi regula 7).
- Dacă textul căutat sunt doar cifre (eventual cu „RO”, spații, puncte) → caută și după **CUI** (comparând doar cifrele), dar și în nume (ex. „2024 Events”).
- Când nu iese nimic **și sunt filtre active**, mesajul explică: „Căutarea «X» e combinată cu filtrele active” + buton **„Caută «X» în toată baza”** care păstrează textul și scoate filtrele.

**1.3 Pagini oficiale în listă** — lângă numele firmei, două sigle mici clicabile: **„in”** (LinkedIn, albastru #0a66c2) și **„f”** (Facebook, #1877f2), doar dacă firma are linkul salvat.

**Criterii de acceptare:** „morarit”, „Morărit” și „MORĂRIT” găsesc aceeași firmă; un CUI scris „RO 12.345.678” e găsit după „12345678”.

---

## 2. Fișa companiei

**2.1 Pagina oficială de LinkedIn și Facebook**
- Sub antetul firmei, două rânduri: LinkedIn și Facebook.
- Dacă linkul există: „Pagina de LinkedIn ↗” + (doar la LinkedIn) **„Vezi angajații ↗”** (linkul paginii + `/people/`) + „schimbă”.
- Dacă lipsește: „Fără pagină de …” + **„Caută pe LinkedIn/Facebook ↗”** (căutare gratuită după numele firmei **fără forma juridică** SRL/SA/SC) + **„+ Adaugă linkul”** (câmp inline, Enter salvează, „Renunță” resetează).
- Validare la salvare: LinkedIn doar `linkedin.com/company|showcase|school/…`; Facebook doar pagini (`facebook.com/<pagina>`, `profile.php?id=…`, `/pages/<nume>/<id>`, `/p/<nume>`), **nu** grupuri, evenimente, share, login. Linkul se normalizează (https, fără parametri).
- „Vezi angajații” apare doar pentru pagini de firmă (nu pentru profiluri personale).
- **Nu** se colectează profiluri personale de Facebook ale angajaților (GDPR).

**2.2 Tabul implicit** — firmele care **încă nu au sponsorizat** se deschid direct pe tabul **Contacte** (mutat pe poziția a 2-a); celelalte pe „Prezentare”. Parametrul `?tab=…` alege explicit tabul (folosit de linkurile din alte pagini).

**2.3 Cardul „Pasul următor”** (sus în tabul Contacte) — UN singur lucru de făcut acum, după starea firmei:
1. există persoane găsite care așteaptă aprobare → „Aprobă persoanele găsite (N)”;
2. un contact a acceptat email → „Trimite prezentarea lui X pe email”;
3. un contact are telefon → „Sună-l pe X (funcția)” cu numărul clicabil (`tel:`) și amintirea frazei GDPR;
4. contacte fără telefon → „Găsește un număr” + Planul B;
5. niciun contact → „Firma nu are încă niciun contact” + Planul B.
Contactele care au refuzat sunt ignorate; contactele marcate „principal” au prioritate.

**2.4 Planul B gratuit** (când lipsesc contacte) — listă numerotată de surse gratuite:
- LinkedIn: „vezi angajații firmei” (dacă e pagina salvată) sau căutare de persoane „<firmă> director”;
- administratorul din registrul comerțului (dacă e în fișă) cu buton **„+ Adaugă ca contact”** (deschide formularul precompletat: nume, funcția „Administrator”, departament „Conducere”);
- site-ul firmei (pagina de contact/echipă);
- telefonul centralei (clicabil) — „cere persoana care se ocupă de sponsorizări / CSR”;
- Google: căutare „<firmă>” director general / director financiar / CSR.

**2.5 Marcajul „Negăsit pe platforme”**
- O singură formulare peste tot: **„Negăsit pe platforme”** (cu explicație la hover: „căutat în bazele de date, nimeni găsit — caută manual: LinkedIn, registrul comerțului, site, centrală”).
- Se păstrează în datele firmei cu **data și cine** a marcat.
- Firmele marcate se pot ascunde/afișa printr-un filtru.

**2.6 Contacte pe telefon (mobil)**
- Acțiunile unui contact coboară sub nume, pe rând întreg; buton mare **„📞 Sună”** (doar pe telefon); butoane de editare/ștergere de minim 32px.
- Formularul de contact pe o singură coloană pe telefon.
- Etichetele lungi se scurtează, nu ies din chenar.

**2.7 Lista „De aprobat”** (persoane găsite de echipă/de un instrument, care încă NU sunt în CRM)
- Câte un rând pe persoană: nume, funcție, departament, sursă, email cu stare (✓ verificat / neverificat / ✗ invalid / nesigur), telefon, LinkedIn.
- Pe fiecare rând: **Aprobă** / **Respinge**; sus: **„Aprobă tot”**, „Bifează tot”, „Aprobă bifații”, „Respinge bifații”.
- **Implicit bifați doar cei din Conducere / Financiar** (să nu se aprobe din greșeală toată lista).
- Văd lista adminii și colegele cu drept de prospectare; aceleași drepturi pentru aprobare și respingere.

---

## 3. Etapele firmei („pipeline”) — redesenat ca „path” (stil Salesforce / HubSpot)

- Etapele grupate pe **4 faze**, fiecare cu culoarea ei și o etichetă mică deasupra:
  - **Prospectare** (gri): Nou, Pe viitor
  - **Primul contact** (albastru): Email trimis, Mesaj trimis, One pager trimis
  - **Discuții** (violet): Discuție telefonică, Întâlnire online
  - **Contract** (portocaliu): Trimis → **În așteptare** → **Semnat** (Semnat e ultima)
- Fiecare etapă e o „săgeată” (chevron, cu `clip-path`); prima din fiecare fază are marginea stângă dreaptă.
- Stări: **curentă** = plină în culoarea fazei (cu punct alb); **făcută** = nuanță deschisă + ✓; **viitoare** = gri neutru.
- Deasupra: „Etapa curentă: … · pasul X din 10”.
- **Rezultatele separat, în dreapta:** 🏆 **Sponsorizat** (verde) și ✕ **Respins**.
- Clic pe o etapă = bifează / debifează (salvare imediată, optimistă); etapa curentă = cea mai avansată bifată, **după ordinea din lista unică de etape** (o singură sursă de adevăr, folosită și pe server).
- **Responsive, fără derulare orizontală:** grilă cu 1 fază pe rând pe telefon, 2 pe laptop/tabletă, 4 pe ecrane foarte late; etichetele se scurtează (trunchiere), nu ies din chenar.

**Criteriu:** la 390px, 1000px, 1366px, 1700px lățime pagina nu are scroll orizontal.

---

## 4. Beneficiari / cazuri

**4.1 Județul pe fiecare card de caz** — pe lista de cazuri și în arhivă: „📍 Județ” în dreapta, pe rândul consultantului; „județ necompletat” dacă lipsește.

**4.2 Panoul „Top 100 companii din județul cazului”** (pe pagina cazului)
- Top 100 firme din județul cazului după cifra de afaceri (județul comparat normalizat: fără diacritice, fără „Municipiul”).
- **Doar firme noi**: exclude firmele care au sponsorizat vreodată (câștigate, cu sumă sponsorizată, recurente sau cu contracte) — dar păstrează firmele deja bifate la acest caz (să nu dispară din progres).
- Carduri compacte pe trepte (Top 10 / 11–30 / 31–60 / 61–100), status dintr-un clic (abordat / interesat / sponsor / refuz), avertizare dacă aceeași firmă e lucrată la alt caz.
- **„✕ Scoate din panou”** cu motiv (ex. „are propria fundație”) → locul ei îl ia următoarea; listă „Scoase din panou (N)” cu **„Pune înapoi”**.
- Pe card: „N contacte în CRM” sau „Fără contact în CRM” (nu „decidenți”); sigle in / f; la firmele fără contact și cu LinkedIn: „vezi angajații pe LinkedIn ↗”.
- Bifă pe card: **„Negăsit pe platforme — de căutat manual”** (o pot pune și editorii).
- Linkul firmei deschide direct tabul Contacte.
- Căutarea din panou: insensibilă la diacritice.
- **Atenție SQL:** la condiții de tip „nu e marcat” folosește `coalesce(..., false)` (altfel `NOT NULL` elimină toate rândurile); la `jsonb_array_length` pe câmpuri care pot să nu fie array, folosește `CASE` (ordinea condițiilor `AND` nu e garantată).

**4.3 „Sponsori din zonă”** (pe pagina cazului) — firmele din județ care au sponsorizat deja; București + Ilfov tratate ca o singură zonă. Adminul vede și sumele nealocate; **editorii văd doar „bani deja alocați”** (sumele de alocare nu pleacă spre browser pentru ei).

---

## 5. Apariții în presă

- Pagină nouă **„Apariții în presă”**: lista cazurilor (din portalul de cazuri) → clic pe caz → lista de publicații (ziare/site-uri).
- La fiecare publicație: bifă **„A publicat”** (publicațiile bifate urcă sus) și bifă **„Postat pe social media”**.
- Buton **„Preia publicațiile din comunicat”**: importă lista de destinatari din ultimul comunicat de presă trimis pentru caz.
- Design aerisit, ușor de citit, progres vizibil („X din Y au publicat”).

---

## 6. One-Pager pentru companii (document A4 de prezentare)

**Bandă „Au susținut deja cazuri din județul X”** (deasupra subsolului, în toate modelele de one-pager):
- Secțiune nouă în formular: **„Companii din județ (logo-uri)”** cu: bifa „Afișează pe one-pager”, buton **„Încarcă din CRM”** (sponsorii din județul completat, ordonați după suma sponsorizată, max. 16), **„+ Adaugă manual”**, pe fiecare rând: bifă de includere, nume editabil, „Logo” (încărcare imagine), ✕.
- **Nimic bifat implicit** + notă: „Bifează doar firmele care au fost de acord să fie menționate public ca sponsori.”
- Logo: din datele firmei dacă există, altfel iconița site-ului (descărcată **pe server** și trimisă ca imagine încorporată / data URL, ca să apară și în PDF); fără logo → doar numele într-o etichetă.
- Afișare: max. 10, **pe un singur rând compact**; când banda e activă, subsolul se scurtează la un rând (pagina A4 are înălțime fixă — **verifică să nu depășească pagina**).
- Numele afișat fără formă juridică și fără majuscule „țipătoare”.

---

## 7. KPI echipă

- Indicator nou automat **„Firme cu LinkedIn / Facebook adăugat”** (zilnic): numărul de firme distincte la care colega a adăugat un link nou de pagină (nu la ștergere / același link). Se înregistrează cine și când a adăugat linkul.
- **Ținta se pune doar la persoana care o dorește** (în cazul meu: doar la coordonator, 15/zi) — **nu** se impune automat tuturor colegelor.

---

## 8. Performanță

- Serverul aplicației să ruleze **în aceeași regiune geografică cu baza de date** (o distanță transatlantică încetinește fiecare pagină).
- Interogările independente de pe o pagină să ruleze **în paralel**, nu una după alta.
- Erorile din secțiuni secundare ale unei pagini să fie prinse și jurnalizate, fără să blocheze toată pagina.

---

## 9. GDPR (date ale persoanelor de contact din firme)

1. **Lista „nu mai căuta”** pe firmă: persoanele **respinse** din „De aprobat” sau **șterse** din contacte se adaugă aici — se păstrează **doar o amprentă (hash)** a numelui/profilului, nu numele. Cine e pe listă nu mai este adus din nou în CRM.
2. **Respingerea / ștergerea șterg efectiv datele** persoanei și din orice cache sau rezultat memorat.
3. Contactele cu acord **„nu”** nu mai sunt îmbogățite/contactate automat.
4. Câmpul de „sursa consimțământului” se folosește doar pentru dovada acordului (nu pentru proveniența datelor).
5. **Retenție automată (job zilnic):** rezultatele de căutare memorate mai vechi de 30 de zile și persoanele neaprobate mai vechi de 60 de zile se șterg.
6. Jurnalele tehnice nu conțin nume de persoane.
7. În tabul Contacte, casetă pliabilă **„Ce spui la primul contact (GDPR)”** cu textul de informare (art. 14) pentru **telefon** și pentru **email** (sub semnătură): cine suntem, de unde avem datele (baze de date profesionale / LinkedIn), scopul (parteneriat de sponsorizare), interesul legitim, dreptul de a cere ștergerea / opoziția („răspundeți STOP” / email de contact) — fiecare cu buton **„Copiază”**.

---

## 10. Ordinea recomandată de implementare

1. Căutare (1.2) + Lucrate recent (1.1)
2. Fișa companiei: LinkedIn/Facebook (2.1), tab implicit (2.2), Pasul următor + Plan B (2.3–2.4), marcaj Negăsit (2.5)
3. Pipeline „path” (3)
4. Contacte pe mobil (2.6) + De aprobat (2.7)
5. Beneficiari: județ pe carduri (4.1), Top 100 (4.2), Sponsori din zonă (4.3)
6. Apariții în presă (5)
7. One-Pager cu logo-uri (6)
8. KPI (7)
9. GDPR (9)
10. Performanță (8)

La final, dă-mi o listă cu: ce s-a implementat, ce fișiere s-au schimbat, cum testez fiecare funcție și ce n-a putut fi făcut (cu motivul).
