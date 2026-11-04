# Prompter — funcționalitățile CRM construite în ultimele 4 zile (agenți AI, Deep Search, Influenceri, filtre, KPI)

> Copiază tot textul de mai jos (de la „ROL”) în Claude Code deschis pe codul **Alexandrit** (platforma multi-organizație).
> Diferența față de prompterul anterior: aici intră și **agenții AI și aplicațiile externe**, dar **fiecare organizație își folosește propriile conturi și chei** (Anthropic, Apollo, Lusha, Prospeo, Hunter, Waalaxy, Meta, email). Platforma nu plătește și nu împarte nicio cheie între organizații.

---

## ROL

Ești programator senior în codul **Alexandrit** — o platformă de fundraising cu mai multe organizații (ONG-uri), fiecare cu spațiul ei (`/[orgSlug]/…`), echipa ei și datele ei. Implementează funcționalitățile de mai jos **adaptându-le la modelul de date, stilul de cod și componentele UI existente**. Nu rescrie ce există; extinde.

## REGULI DE LUCRU (obligatorii)

1. **Citește întâi proiectul:** tabelele (organizații, membri și roluri, companii, contacte, persoane fizice, cazuri, KPI), felul în care se fac acțiunile pe server, izolarea între organizații (RLS / `org_id`) și mecanismul existent de secrete criptate (`src/lib/secret-box.ts`, folosit deja pentru cheile Stripe ale fiecărei organizații).
2. **Izolare între organizații:** orice interogare, orice cache, orice fișier, orice statistică de consum se filtrează după organizație. O organizație nu vede niciodată datele, cheile sau costurile alteia.
3. **Lucrează pe etape mici:** implementare → tipuri / lint / teste → descriere scurtă. Nu treci mai departe dacă etapa curentă nu trece verificările.
4. **Interfața în română, cu diacritice**, texte scurte pentru colege ne-tehnice; totul utilizabil pe **telefon** (fără derulare orizontală).
5. **Drepturi verificate pe server**, nu doar ascunse în interfață. „Doar administrator” = nu apare și nu funcționează pentru alte roluri.
6. Căutările după nume: **insensibile la diacritice și majuscule** (ș/ş, ț/ţ incluse); caracterele `%` și `_` din căutare se escapează în `like`.
7. Datele trimise în browser: **ISO 8601** (`2026-11-03T14:05:00Z`), nu formatul text al bazei de date (Safari nu îl citește). Calculele „azi / scadent” în **ora României** (`Europe/Bucharest`).
8. Validează la server orice id (uuid strict), orice valoare de tip „platformă / canal / etapă” (listă albă), orice parametru din URL (un parametru repetat vine ca listă; plafonează numerele).
9. Nu înghiți redirect-ul de autentificare: în `try/catch` din acțiunile pe server, apelează `unstable_rethrow(e)` înainte de a transforma eroarea în mesaj.
10. GDPR: vezi secțiunea 11. Nu salva date personale inutil, nu le trimite la AI fără temei.

---

## 0. FUNDAȚIA: „Conturile organizației” (se face PRIMA)

**Setări → Integrări & AI** (doar administratorul organizației). Pentru fiecare serviciu: câmp de cheie (parolă), **„Testează conexiunea”**, starea („Conectat • se termină în …4f2a”, data conectării), **„Deconectează”**.

| Serviciu | Ce cheie | La ce folosește |
|---|---|---|
| **Anthropic (Claude)** | cheia API a organizației | toți agenții AI (secțiunile 1–4, 6, 7) |
| Apollo / Lusha / Prospeo / Hunter | cheile lor | Deep Search decidenți (secțiunea 5) |
| Waalaxy | cheia API | trimiterea contactelor în campanii LinkedIn (secțiunea 8) |
| Meta Ads (opțional) | token + ID cont reclame | analiza reclamelor (secțiunea 3) |
| Email (SMTP + IMAP) | pe fiecare **utilizator** (adresa lui) | Agentul email (secțiunea 1) |

Reguli:
- Cheile se **criptează** cu `secret-box.ts` (ca la Stripe), se citesc **doar pe server**, se afișează doar ultimele 4 caractere. Nu apar niciodată în loguri, în erori trimise în browser sau în istoricul git.
- **Fără cheie → funcția nu consumă nimic**: butonul arată „Conectează contul Anthropic în Setări → Integrări” (sau furnizorul respectiv), nu o eroare tehnică. Nu există cheie „de rezervă” a platformei.
- Modelul AI implicit: `claude-opus-5-5` (configurabil pe organizație); adaptive thinking; streaming pentru răspunsuri lungi; parametrul `fallbacks: "default"` (beta `server-side-fallback-2026-07-01`) pentru refuzuri.
- Mesaje clare pentru erorile frecvente: „S-au terminat creditele în contul Anthropic al organizației (console.anthropic.com → Billing)”, „Cheia nu mai e validă”, „Prea multe cereri — încearcă peste un minut”.

**Consum AI (doar administratorul organizației)** — pagină nouă:
- fiecare apel AI își notează tokenii (intrare / ieșire / cache) și **căutările web** (server tool; $10 / 1000) → cost în USD după prețul modelului;
- totaluri: luna curentă, pe instrument (agent email, analiza reclamelor, influenceri, analiză ONG, deep search AI…), grafic pe ultimele 31 de zile, istoric pe luni, cost mediu pe generare, estimarea la final de lună;
- **buget lunar** setabil (USD + curs afișat în lei), cu procent consumat; precizare că limita reală se pune în consola Anthropic a organizației;
- evidența nu blochează niciodată generarea (dacă scrierea ei eșuează, generarea merge mai departe).

---

## 1. Agent email (AI) către companii

Scop: AI-ul scrie ciorne personalizate pentru firme, **omul le citește, le corectează și le aprobă**, iar emailul pleacă **din căsuța colegului** (SMTP-ul lui), cu semnătura lui și One Pager-ul firmei atașat. Răspunsurile vin direct în căsuța lui.

**Generare ciorne**
- Candidați: firmele responsabilului ales (selectul de coleg preia firmele lui), cu filtre: sponsori / nesponsori, scor minim, doar cu acord de email, D177 / sponsorizare / caz umanitar, ordonare.
- Destinatar: persoana marcată „contact direct” (inimioara), altfel decidentul cu cel mai bun rol; se verifică email valid, acord ne-refuzat, să nu fi primit email recent de la organizație (fără dubluri).
- Prompt: datele firmei din CRM (istoric, sponsorizări anterioare, județ, mecanism D177 / 20% cu fereastra fiscală curentă și suma estimată), cazul potrivit (doar dacă poate fi distribuit public — vezi 11), **8 stiluri de deschidere** diferite (să nu sune la fel), salut corect („Stimată doamnă Popescu”), propunere de apel cu 2–3 intervale concrete, fără formulări juridice greșite.
- **Verificări automate ale ciornei** înainte de trimitere: lungime, linkuri, numele altui coleg în text, salut, subiect.
- Două variante de subiect, alegi una.

**Trimitere sigură**
- Stări: `ciornă → se_trimite → trimis | eroare`, cu **revendicare atomică** (două clicuri / două taburi nu trimit de două ori).
- Fereastră de confirmare cu **„Trimite de la”** (colegul expeditor), previzualizarea completă (mereu sub textul editabil), destinatar, atașament; buton **„Trimite-mi un test”**.
- Limită pe expeditor / zi (ex. 40) pentru reputația domeniului; PDF general al organizației doar încărcat de administrator și fixat prin amprentă (dacă se schimbă, trimiterea se oprește până la reconfirmare).
- `Message-ID` / `In-Reply-To` / `References` salvate → răspunsurile se leagă de fir.
- Pixel de deschidere (opțional, configurabil), „a deschis emailul” vizibil în listă.

**După trimitere**
- **Citirea răspunsurilor (IMAP)** din căsuța fiecărui coleg: se potrivesc pe fir (Message-ID), răspunsurile automate (out-of-office) se ignoră, AI-ul etichetează răspunsul (interesat / mai târziu / nu / alt contact) și îl notează în istoricul firmei.
- **Reveniri:** după 5 zile lucrătoare fără răspuns → ciornă de revenire scurtă (AI) + sarcină „Sună” cu **scriptul de apel**.
- Tab **„Azi”** (ce ai de făcut azi), **statistici** (trimise, deschise, răspunsuri, pe coleg), filtru „Trimise deja”.
- Ciornele netrimise mai vechi de **14 zile** se șterg automat; ștergere în masă „vechi / toate”.
- **„Rescrie cu AI”** pentru o ciornă (inclusiv în numele altui coleg, cu semnătura lui).

---

## 2. One Pager pentru companii — editabil direct pe pagină

- Datele de contact (nume responsabil, funcție, telefon, email, site, adresă) și **banda de jos (CTA)** devin editabile direct pe documentul A4 (contenteditable, cu marcaj vizual la hover, textul implicit selectat la focus).
- Ce editezi se folosește la generarea PDF-ului și se poate salva ca implicit pe firmă.

---

## 3. Analiza săptămânală a reclamelor (AI)

- Job săptămânal (luni dimineață) + buton manual: AI-ul primește cheltuielile pe campanie (din importul CSV sau, dacă organizația a conectat Meta Ads, sincronizate), clicurile pe linkurile cu urmărire și **donațiile atribuite exact** (UTM salvat la donație ↔ donația încasată).
- Răspuns structurat (JSON): rezumat, campanii câștigătoare, pierderi, **maxim 3 propuneri** (buget / text / public / oprire / măsurare, cu text nou propus), „de verificat”.
- Ultimele analize păstrate și afișate pe pagina Reclame.

---

## 4. Analiză ONG-uri (doar administratorul organizației)

Pagină nouă: scrii **numele unui ONG** (opțional site + „ce te interesează”) → Claude cu **căutare web** (`web_search_20260209`, max. 15 căutări) analizează cum strânge bani acel ONG.
- Rulează **în fundal** (`after()`, `maxDuration` 300), pagina se reîmprospătează singură la 10 s; nu pornește a doua analiză pentru același ONG cât prima e în lucru; tura întreruptă (`pause_turn`) se reia.
- Raport în română: Pe scurt · Canale de strângere de fonduri · Campanii notabile · Comunicare & marketing · Relația cu donatorii și companiile · Cifre publice · **Ce putem prelua** · Ce să nu copiem; **sursele** (din rezultatele căutării și din citări) listate cu link.
- Reguli în prompt: doar informații găsite; cifre cu anul și sursa; fără date personale ale persoanelor private.
- Ultimele 40 de analize salvate pe organizație; „Copiază raportul”, „Șterge”.

---

## 5. Deep Search — decidenți pentru o firmă (fișa firmei → Contacte)

**5.1 „🔎 Caută decidenți (Deep Search)”** — în aplicațiile conectate de organizație:
- **Apollo întâi** (căutarea lui e gratuită și află site-ul firmei o singură dată), apoi **Prospeo, Lusha, Hunter în paralel**;
- rezultatele unite, **fără dubluri doar între furnizori** și doar pe nume complet (numele dintr-un singur cuvânt nu se unesc — ar contopi persoane diferite); la dublură se preferă furnizorul care are deja emailul;
- sus: câți a găsit fiecare furnizor, „(memorat)” dacă rezultatul vine din cache, sau **motivul exact** al erorii (cheie lipsă, credite, „nu mai consuma credite”);
- lângă fiecare nume: insigna furnizorului + „găsit și în …”;
- **„Aprobă”** aduce email / telefon **de la furnizorul care a găsit persoana**, doar pentru cei bifați; o eroare la un furnizor nu le pierde pe celelalte, iar cei eșuați rămân în listă pentru reîncercare;
- opțiunea „Cere și telefonul mobil” (Apollo / Prospeo; credite în plus);
- varianta „sau în lanț (economic)”: se oprește la primul furnizor care găsește;
- Lusha: treapta fără filtru de contact e refuzată de API → raportează „0 găsiți”, nu eroare.

**5.2 „🌐 Caută pe internet (AI)”** — buton separat, verde:
- Claude cu căutare web caută decidenții în **surse publice** (site-ul firmei — Echipă / Despre / Contact, presă, rapoarte anuale, registre publice) pornind de la nume, CUI, localitate, site, administratorul din registru;
- întoarce **nume + funcție + URL-ul sursei**; email / telefon **doar dacă sunt publicate** (nu ghicește adrese); elimină numele dintr-un cuvânt și emailurile invalide; max. 8;
- **nu** folosi `user_location` cu țara RO (API-ul o refuză);
- rezultatul memorat **30 de zile** pe firmă (+ link „caută din nou”); costul intră în Consum AI;
- la „Aprobă” se adaugă direct (fără credite de furnizor), cu proveniența `web-ai`.

**5.3 Afișare** — contactele găsite cu AI au **inima verde** (plină dacă sunt „contact direct”, conturată altfel); restul rămân cu inima în culoarea platformei. Numerele găsite de AI sunt de obicei **centrala firmei** — marchează-le „☎ fix / centrală” vs. „📱 mobil” (prefix 07).

---

## 6. Influenceri (pagină simplă: lista + fișa)

**Lista** — căutare, filtre: **platforma** (butoane Toate / Instagram / Facebook / TikTok / YouTube — cu platforma aleasă apar doar influencerii de acolo, cu urmăritorii și ordinea de pe acea platformă), categorie (11), etapă, responsabil, caz, audiență, **județ** (+ „Diaspora”, „Fără județ”), import **CSV / Excel** (fișier sau lipit din Excel; parser pe caractere care acceptă celule pe mai multe rânduri; handle-ul ca nume dacă lipsește; pe bucăți de 200 de rânduri).

**Fișa** — profil; la adăugare bifezi **doar platformele pe care e activ**; sursa datelor + temeiul legal; **Centru de contactare**:
1. alegi cazul (doar cele care pot fi distribuite public) și platforma;
2. primești **linkul unic** (`/r/<caz>-i<cod aleator>` — opac, fără numele influencerului) + **3 variante de mesaj AI** editabile (DM Instagram scurt, Facebook Messenger, propunere pe termen lung) sau un șablon dacă AI-ul nu e disponibil;
3. **1. Copiază → 2. Deschide conversația** (`ig.me/m/<handle>`, `m.me/<handle>`) → **3. „Am trimis”** (doar acest buton marchează trimiterea; deschiderea profilului nu marchează nimic).
- **Coordonare:** dacă alt coleg i-a scris în ultimele N zile, avertismentul apare **deja la „Pregătește mesajul”**, iar „Am trimis” cere confirmarea „preiau eu”.
- După „Am trimis”: etapa „Așteptăm răspuns”, verificare programată (+3 zile), reveniri la +7 zile, **maxim N reveniri** — **nimic nu se trimite automat**.
- Răspuns, etapă, notă, follow-up, **„Nu mai contactăm”** (blochează mesajele și revenirile), istoric = jurnal de audit, linkuri cu **clicuri și donații confirmate** (doar donațiile încasate care poartă exact `utm_campaign` = slugul linkului; fără atribuire estimativă, fără dublare).
- Deduplicare după handle / email (`profile.php?id=…`, `/channel/…` recunoscute corect); index unic anti-dubluri.
- Ștergere la cerere (admin): șterge fișa și istoricul, scoate numele din descrierea linkurilor, păstrează doar cheile de excludere (**toate**: fiecare handle + email) ca să nu mai fie readăugat; o fișă „Nu mai contactăm” rămâne editabilă.
- Meta: primul mesaj către cineva care n-a scris paginii **nu** se poate trimite prin API — fluxul rămâne manual. Nu folosi scraping, extensii de trimitere în masă, conturi simulate.

**KPI:** indicator automat **„Influenceri identificați”** (fișe create de coleg în ziua respectivă, fără cele șterse), cu ținta setată doar la cine o vrea (ex. 10/zi). Tabelul e creat de modul; pe calea KPI se verifică doar existența lui (`to_regclass`), fără DDL.

---

## 7. Companii — filtre și număr pe rândul principal

- **„Nu sunt sponsori”** (pereche cu „Sponsorii noștri”), **responsabilul** mereu vizibil, **D177 / Decembrie / Caz** pe rândul principal.
- **Filtrele active mereu la vedere**, ca etichete cu ✕ (ex. „Doar firme lucrate” persistat din sesiunea trecută).
- **„Doar firmele cu contacte”** lângă paginare.
- Select **„👥 Contact”**: toate · **cu contact (N)** · **fără contact (N)** · **💚 cu contacte găsite cu AI (N)**.
- Select **„✈️ Waalaxy”** (doar admin): toate · **netrimise (N)** · **trimise (N)** — „trimisă” = cel puțin un contact al firmei trimis în Waalaxy (starea Waalaxy pe firmă sau istoricul cu nota dintr-o **constantă comună**).
- Numerele țin cont de filtrele active, rulează **în paralel**, sunt **memorate 2 minute** pe combinația de filtre și au o limită de **5 s fără resetarea conexiunilor** (dacă durează, eticheta apare fără număr).
- **Deep Search în CRM** (căutare profundă, `?deep=1`): textul se caută și în contacte (nume, email, telefon, funcție), oraș, județ, domeniu / CAEN, site, notițe, istoric, profilul AI — la fel în **persoane fizice** și în **lista de contacte ale firmelor**.
- Proveniența contactelor: adaugă „Internet (AI)” (`web-ai`).

---

## 8. Alte îmbunătățiri din aceste zile

- **KPI pe sezon:** indicatorii marcați „doar în sezon” (ex. telefoane și chestionare către donatori — doar în campania Formularului 230, ianuarie–mai) dispar în afara sezonului din „Astăzi”, din plan **și din scor / calendar / restanțe**. Programul de lucru le afișează după lună; numele sarcinilor nu se schimbă (bifele salvate depind de ele).
- **KPI „One Pagere făcute”** (firme distincte pe zi cu one-pager generat), țintă pe persoană; pagina KPI suportă până la 6 carduri „Astăzi”.
- **Ținta lunii:** navigare pe luni cu ‹ › (vezi și editezi lunile trecute).
- **Contracte de semnat:** ascunde contractele semnate de toți, chiar dacă serviciul de semnătură le ține „în curs”.
- **Comunicate de presă pe 2 zile:** trimite jumătate acum, restul salvat pentru „seria de mâine” (limita zilnică a căsuței).
- **Formular de cerere:** casetă „Scanează actele cu telefonul” cu o aplicație gratuită de scanare (iconița ei, coduri QR iPhone / Android).

---

## 9. Lecții de la verificarea codului (aplică-le peste tot)

- Indicatorii ascunși trebuie scoși **din toate locurile** care îi folosesc (afișare, scor, calendar, restanțe), nu doar din carduri.
- Nicio căutare plătită nu se repetă inutil: cache pe furnizor, operația comună (ex. găsirea site-ului) făcută **o dată**, înainte de apelurile paralele.
- DDL la runtime: verificare ieftină de existență + tranzacție cu `pg_advisory_xact_lock`; niciodată `ALTER TABLE` la fiecare pornire.
- Importurile mari pe bucăți; citirile comune (excluderi) o singură dată.
- Erorile fiecărui furnizor / pas se raportează separat; un eșec parțial nu pierde rezultatele reușite.
- Fără `catch {}` mut pe interogările de bani — jurnalizează eroarea.

---

## 10. Ordinea recomandată

1. **Conturile organizației + Consum AI (0)** — fără ele nimic din AI nu pornește.
2. Filtre Companii + Deep Search în CRM (7)
3. Deep Search decidenți: aplicații (5.1), apoi AI pe internet (5.2), inima verde + filtru (5.3, 7)
4. Agent email (1) — întâi generarea + trimiterea sigură, apoi IMAP, reveniri, statistici
5. One Pager editabil (2)
6. Influenceri (6) + KPI-ul lor
7. Analiza reclamelor (3), Analiză ONG-uri (4)
8. KPI pe sezon și restul (8)

---

## 11. GDPR și siguranță

1. **Cazurile medicale** trimise la AI sau către public (influenceri, emailuri): doar cele care pot fi distribuite public — **fără** cele anonimizate, cu acord retras sau ale minorilor fără acord de distribuire. **Diagnosticul și descrierea cazului** (care conține de obicei diagnosticul) doar cu acordul pentru diagnostic; poza doar cu acordul pentru imagine.
2. Decidenții firmelor: doar date profesionale; sursa notată pe contact; persoanele respinse / șterse intră în lista „nu mai căuta” (doar amprentă, nu numele).
3. Influencerii: doar date publice profesionale, cu sursa și temeiul legal; un profil public **nu** înseamnă acord pentru mesaje automate sau în masă.
4. Cheile organizațiilor: criptate, doar pe server, niciodată în loguri sau în git.
5. Nicio funcție nu trimite mesaje automat în numele unui om; „trimis” se marchează doar din API-ul de email sau din acțiunea explicită a colegului.

---

La final, dă-mi: ce s-a implementat, ce fișiere s-au schimbat, ce chei trebuie să conecteze o organizație în Setări ca să folosească fiecare funcție, cum testez fiecare funcție și ce n-a putut fi făcut (cu motivul).
