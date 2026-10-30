import type { Locale } from "../config";
import type { SectiuneLegala } from "./termeni";

// Politica de confidențialitate (GDPR) — platforma Alexandrit, operată de Medigroupplus SRL.
// Proiect de lucru: trebuie verificat de un jurist / DPO înainte de a fi considerat definitiv (vezi DraftBanner).
export const GDPR_DICT = {
  ro: {
    homeLabel: "Acasă",
    eyebrow: "Legal",
    titlu: "Politica de confidențialitate (GDPR)",
    actualizatLabel: "Ultima actualizare",
    actualizat: "24 octombrie 2026",
    sectiuni: [
      {
        titlu: "1. Cine suntem și în ce calitate prelucrăm date",
        paragrafe: [
          "MEDIGROUPPLUS SRL (CUI 38103518, J07/617/2017, cod CAEN 7311; sediul social: Str. Prieteniei nr. 4, sat Boscoteni, comuna Frumușica, județul Botoșani) operează platforma Alexandrit („Platforma”) și site-ul alexandrit.ro și este operator de date pentru datele proprii ale vizitatorilor site-ului, ale clienților noștri și ale utilizatorilor Platformei (cont, abonament, facturare, comunicare, consiliere).",
          "Alexandrit nu preia date cu caracter personal de la parteneri. Datele donatorilor, sponsorilor, voluntarilor, beneficiarilor sau angajaților unei organizații partenere nu devin datele noastre: rămân sub controlul exclusiv al organizației, în spațiul ei izolat din Platformă, noi nu le folosim în scopuri proprii, nu le comunicăm altora și nu le combinăm cu alte date. Furnizăm doar infrastructura tehnică prin care organizația își gestionează propriile date, în calitate de persoană împuternicită (vezi punctul 9).",
          "Contact pentru orice aspect legat de datele personale: vlad.placinta@alexandrit.ro, telefon 0757 401 042.",
        ],
      },
      {
        titlu: "Definiții",
        puncte: [
          "Date cu caracter personal — orice informație privind o persoană fizică identificată sau identificabilă;",
          "Operator — cel care stabilește scopurile și mijloacele prelucrării; Persoană împuternicită — cel care prelucrează date în numele operatorului;",
          "Client / Organizație — ONG-ul sau alt partener care își creează un cont în Platformă;",
          "Utilizator — persoana care accesează Platforma prin contul unui Client; Vizitator — persoana care accesează site-ul fără cont;",
          "Site — alexandrit.ro; GDPR — Regulamentul (UE) 2016/679.",
        ],
      },
      {
        titlu: "2. Ce date prelucrăm în calitate de operator",
        paragrafe: ["Pe site și în Platformă, pentru propriile noastre scopuri, prelucrăm date doar în următoarele situații:"],
        puncte: [
          "Formularele de contact și programările: nume, email, telefon, mesaj, intervalul ales — pentru a-ți răspunde și a organiza consilierea;",
          "Formularul „Descoperă Alexandrit” (fereastra de pe site și pagina /descopera): numele tău, denumirea organizației, adresa de email, telefonul (dacă îl completezi), pagina de pe care ai scris și, dacă ai venit dintr-o campanie, sursa ei (parametrii din link). Le păstrăm într-o listă internă, vizibilă doar echipei Alexandrit, împreună cu starea discuției (nou, contactat, în discuție, înscris, pierdut) și notițe interne despre discuțiile noastre, pentru a te contacta și a ține evidența cererilor. Dacă completezi formularul de mai multe ori cu aceeași adresă, păstrăm o singură înregistrare, cu numărul de completări. Un exemplar al cererii ajunge și prin email la echipă. Numele, organizația și adresa de email sunt necesare ca să îți răspundem; telefonul e opțional. „Sursa” e eticheta din linkul pe care ai venit, folosită ca să vedem care campanii aduc cereri. Notițele noastre interne despre discuții sunt date personale despre tine: poți cere să le vezi;",
          "Crearea contului și achiziționarea serviciilor: nume, email, rolul în organizație, parola (stocată criptat, prin furnizorul de autentificare), data și versiunea Termenilor și a Politicii de confidențialitate acceptate la înscriere, date de facturare (denumire, CUI, adresă), istoricul facturilor și al abonamentelor; datele cardului sunt prelucrate exclusiv de procesatorul de plăți și nu ajung la noi;",
          "Reînnoirea automată a abonamentului: dacă plătești abonamentul cu cardul, procesatorul de plăți ne poate transmite un token reutilizabil și data expirării cardului (nu numărul cardului). Tokenul îl stocăm criptat, ca să putem încasa automat abonamentul lunar; reînnoirea automată se poate opri oricând din Setări, iar tokenul se șterge după trei încercări de încasare eșuate;",
          "Newsletter și comunicări comerciale: adresa de email și preferințele, doar dacă ți-ai dat consimțământul;",
          "Cookie-uri: cookie-uri necesare funcționării (sesiune) și, doar cu acordul tău, cookie-uri de analiză — vezi Politica de cookies;",
          "Chestionarul de satisfacție și sugestiile din Platformă: notele și textele pe care le scrii, organizația ta și utilizatorul care a răspuns; adresa ta de e-mail o folosim pentru a te contacta doar dacă bifezi acest lucru;",
          "Măsurarea reclamelor pe paginile de campanie: parametrii UTM din linkul pe care ai venit (sursa, canalul, codul campaniei) și momentul vizitei, legați de donația făcută; cu acordul tău pentru statistici, ultimul astfel de context se păstrează în browser cel mult 30 de zile, ca donația făcută la o a doua vizită să rămână atribuită. Nu conține nume, e-mail sau alt identificator, iar datele nu se trimit platformelor de reclame;",
          "Centrul de inovare (idei propuse de organizații): titlul, descrierea și „cum rezolvi acum” pe care le scrii, categoria, ce vrei să crești și cât de des apare problema, prenumele tău, adresa de email, organizația ta și utilizatorul care a propus sau a votat o idee, precum și raportările primite despre o idee. Ideea (textul) și numărul de voturi sunt vizibile celorlalte organizații din Platformă; numele organizației se afișează doar dacă bifezi, iar prenumele, adresa de email și cine a votat nu se afișează. Echipa Alexandrit vede autorul și adresa de email, ca să te anunțe când se schimbă starea ideii, și, când ai votat o idee, îți scrie 1 la 1 când intră în lucru sau e gata. Te rugăm să nu scrii date personale ale donatorilor, beneficiarilor sau colegilor: nu acceptăm adrese de email, numere de telefon sau CNP-uri în text",
          "Vizitatorii site-ului: date tehnice minime (adresă IP, tip de browser, jurnale de securitate și erori).",
        ],
      },
      {
        titlu: "3. Scopurile și temeiurile legale",
        paragrafe: ["Prelucrăm datele pentru următoarele scopuri, pe temeiurile de mai jos:"],
        puncte: [
          "furnizarea Platformei, a contului, a abonamentului (inclusiv reînnoirea lui automată, dacă ai ales plata cu cardul) și a suportului — executarea contractului (art. 6(1)(b) GDPR);",
          "Centrul de inovare — interes legitim (art. 6(1)(f)): să colectăm, să moderăm și să prioritizăm ideile de îmbunătățire propuse de organizații, să le arătăm celorlalte organizații ca să poată vota și să te anunțăm 1 la 1 despre ideile tale sau votate de organizația ta. Bifa „arată numele organizației mele” este o alegere de publicare, nu un consimțământ. Te poți opune oricând (art. 21), inclusiv cerând retragerea ideii",
          "păstrarea dovezii acceptării Termenilor și a Politicii de confidențialitate (data și versiunea) — interes legitim, ca să putem dovedi încheierea contractului (art. 6(1)(f));",
          "facturare, contabilitate și obligații fiscale — obligație legală (art. 6(1)(c));",
          "securitatea Platformei, prevenirea abuzurilor și îmbunătățirea serviciului, inclusiv analiza răspunsurilor la chestionarul de satisfacție și a sugestiilor — interes legitim (art. 6(1)(f)); contactarea ta pe baza unui răspuns se face doar cu acordul bifat de tine (art. 6(1)(a));",
          "comunicări comerciale opționale și cookie-uri de analiză — consimțământ (art. 6(1)(a)), pe care îl poți retrage oricând;",
          "răspunsul la solicitări și programarea consilierilor — măsuri precontractuale la cererea ta sau interes legitim;",
          "răspunsul la cererea trimisă prin formularul „Descoperă Alexandrit” și păstrarea ei în lista internă, cu starea și notițele — interes legitim (art. 6(1)(f)): să răspundem solicitării organizației pe care o reprezinți, să nu pierdem cereri și să nu te contactăm de mai multe ori pentru același lucru; dacă te adresezi în nume propriu (de exemplu ca persoană care desfășoară o activitate independentă), măsuri precontractuale la cererea ta (art. 6(1)(b)). Te poți opune oricând prelucrării pe interes legitim (art. 21), inclusiv păstrării în listă. Nu folosim aceste date pentru newsletter și nu le dăm altora; mesajele comerciale generale se trimit doar cu consimțământul tău separat.",
        ],
      },
      {
        titlu: "4. Cui transmitem datele (sub-procesatori și furnizori)",
        paragrafe: ["Folosim furnizori tehnici care prelucrează date în numele nostru sau pentru serviciile pe care le folosești, pe baza unor contracte de prelucrare:"],
        puncte: [
          "Vercel — găzduirea aplicației și a site-ului;",
          "Supabase — baza de date și autentificarea (regiune UE);",
          "Stripe — plata donațiilor pe paginile de campanie, direct în contul Stripe propriu al fiecărei organizații (platforma nu deține un cont Stripe și nu vede datele cardului);",
          "Netopia Payments — plata abonamentului platformei (numele și emailul persoanei care plătește abonamentul, pe pagina de plată găzduită de Netopia; datele cardului rămân la Netopia, iar noi păstrăm doar tokenul reutilizabil, pentru reînnoirea automată);",
          "Oblio — emiterea și trimiterea facturilor fiscale;",
          "serviciul de email al domeniului alexandrit.ro, găzduit la furnizorul de web hosting al platformei (romania-webhosting.com) — emailuri de cont, factură, mulțumire și reamintire, cererile din formularul „Descoperă Alexandrit” către echipă și, ca persoană împuternicită, mesajele automate ale organizațiilor către donatorii lor (parcursuri);",
          "Google — autentificarea cu contul Google, dacă alegi această metodă;",
          "Twilio — apeluri și mesaje, unde funcția este activată;",
          "Google Analytics — statistici de utilizare, doar cu consimțământul tău;",
          "Sentry — monitorizarea erorilor tehnice ale aplicației (mesaje de eroare și informații despre dispozitiv/browser; adresele paginilor sunt curățate de parametri și tokenuri, iar emailurile și datele din formulare nu se trimit);",
          "Google Fonts și Cloudflare (cdnjs) — fonturi și biblioteci încărcate de unele instrumente din zona autentificată a platformei (primesc adresa IP a utilizatorului la încărcare);",
          "Anthropic (Claude) — generare de conținut asistată de AI în modulul de strângere de fonduri (comunicate de presă, postări pentru rețele sociale, mesaje de mulțumire pentru sponsori), pe baza titlului campaniei, a poveștii, a sumelor și, pentru mesajele de mulțumire, a numelui sponsorului; funcție opțională, folosită doar când organizația apasă „Generează cu AI”. La fel, în modulul de rapoarte pentru companii, documentele financiare încărcate de organizație (Balanță, Bilanț) și datele sponsorizărilor sunt trimise către Anthropic pentru extragerea cifrelor și redactarea raportului. În modulul Granturi, dosarul organizației și cerințele finanțatorului (fără contactele și IBAN-ul din dosar) sunt trimise către Anthropic pentru redactarea cererilor de finanțare, iar căutarea de apeluri folosește căutarea web a Anthropic;",
          "servicii de integrare activate la cerere de client (de exemplu Make.com, BoldSign, Newsman, Brevo, Mailchimp, Canva) — doar pentru clientul care le solicită.",
        ],
        incheiere: ["Nu vindem date personale. Le putem transmite autorităților doar când legea ne obligă. Lista actualizată a sub-procesatorilor ne poate fi cerută oricând la datele de contact de mai sus."],
      },
      {
        titlu: "5. Transferuri în afara Spațiului Economic European",
        paragrafe: ["Unii furnizori (de exemplu Stripe, Google, Twilio, Vercel, Anthropic) pot prelucra date și în afara SEE, în special în SUA. În aceste cazuri ne bazăm pe garanții prevăzute de GDPR: decizia de adecvare privind Cadrul UE–SUA de confidențialitate a datelor pentru furnizorii certificați sau clauzele contractuale standard, împreună cu măsuri suplimentare atunci când este necesar. Datele din baza de date a Platformei sunt găzduite în UE."],
      },
      {
        titlu: "6. Cât timp păstrăm datele",
        puncte: [
          "date de cont și de organizație: pe durata contractului. Dacă accesul expiră (probă sau abonament) și contul nu este reactivat, le ștergem definitiv la 90 de zile de la expirare. Înainte de ștergere trimitem două avertizări prin email (la 60 și la 83 de zile), iar datele pot fi exportate oricând, inclusiv cu accesul expirat, de către owner;",
          "documente fiscale și contabile (facturi, contracte): conform legislației contabile din România, de regulă 10 ani;",
          "tokenul cardului pentru reînnoirea automată: până îl elimini din Setări, până la încetarea abonamentului sau până la a treia încercare de încasare eșuată, când se șterge automat;",
          "dovada acceptării Termenilor și a Politicii (data și versiunea): pe durata contului și, după încetare, cât timp pot apărea pretenții legate de contract;",
          "jurnale tehnice și de securitate: pe perioade scurte, strict necesare;",
          "date de contact din solicitări: cât timp este necesar pentru a răspunde și, după aceea, cel mult perioada în care pot apărea pretenții legate de solicitare;",
          "cererile din formularul „Descoperă Alexandrit”: dacă devii client, datele trec în contul tău și urmează regulile de mai sus; dacă nu, le ștergem după cel mult 24 de luni de la ultima ta completare sau de la ultima discuție, sau mai devreme, la cererea ta;",
          "Centrul de inovare: ideile active, cât timp există Platforma; ideile ascunse sau cu starea „Nu acum” se șterg după 24 de luni. La ștergerea contului tău, prenumele și legătura cu contul se anulează, iar ideea poate rămâne, anonimizată; la ștergerea organizației, numele organizației și prenumele autorului se anulează, iar voturile și raportările se șterg. La cerere, ascundem imediat o idee și o ștergem definitiv în cel mult 30 de zile",
          "datele introduse în CRM de către organizațiile client: conform instrucțiunilor și politicilor de retenție ale organizației (operatorul acestor date).",
        ],
      },
      {
        titlu: "7. Drepturile tale",
        paragrafe: [
          "Conform GDPR ai dreptul de acces, rectificare, ștergere, restricționare a prelucrării, portabilitate, opoziție și dreptul de a nu face obiectul unei decizii bazate exclusiv pe prelucrare automată. Îți poți retrage oricând consimțământul, fără a afecta legalitatea prelucrării de până atunci.",
          "Pentru a-ți exercita drepturile, scrie-ne la vlad.placinta@alexandrit.ro; îți răspundem în cel mult o lună. Dacă datele tale se află în CRM-ul unei organizații (de exemplu ești donator), cererea trebuie adresată acelei organizații; noi o vom ajuta să răspundă. Dacă ai cont în platformă, îl poți șterge singur, oricând, din pagina „Contul meu” (alexandrit.ro/cont).",
          "Ai dreptul să depui o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP), www.dataprotection.ro.",
        ],
      },
      {
        titlu: "8. Securitatea datelor",
        paragrafe: [
          "Aplicăm măsuri tehnice și organizatorii adecvate: conexiuni criptate (HTTPS), izolarea strictă a datelor între organizații la nivel de bază de date, control al accesului pe roluri, jurnale de securitate, copii de siguranță și acces limitat al echipei noastre la datele clienților, doar atunci când este necesar pentru suport și cu respectarea confidențialității.",
          "În caz de încălcare a securității datelor cu risc pentru persoanele vizate, notificăm organizațiile client afectate fără întârzieri nejustificate, astfel încât acestea să își poată îndeplini obligațiile de notificare, și autoritățile, când este cazul.",
        ],
      },
      {
        titlu: "9. Datele partenerilor: Alexandrit nu le preia (persoană împuternicită)",
        paragrafe: [
          "Organizația care folosește Platforma este operator pentru datele persoanelor din CRM-ul său (donatori, sponsori, voluntari, beneficiari, angajați, contacte) și decide singură scopurile și temeiul prelucrării, informarea persoanelor și perioada de păstrare. Alexandrit nu preia aceste date, nu le achiziționează și nu le folosește pentru scopuri proprii, de marketing sau de altă natură.",
          "Rolul nostru este strict tehnic: găzduim aplicația în care organizația își introduce și gestionează datele, izolat de alte organizații, ca persoană împuternicită. Nu accesăm datele unei organizații decât la cererea ei, pentru suport tehnic, sau când legea ne obligă; nu le comunicăm terților (în afara sub-procesatorilor tehnici de la punctul 4) și nu le combinăm cu alte date.",
          "Prin acordul de prelucrare (DPA, disponibil la alexandrit.ro/dpa și acceptat de organizație la crearea contului sau din Setări) ne angajăm, printre altele, să: păstrăm confidențialitatea; aplicăm măsuri de securitate adecvate; folosim sub-procesatori doar cu informarea organizației; asistăm organizația în exercitarea drepturilor persoanelor vizate; o notificăm fără întârzieri nejustificate despre incidente; și, la încetarea contractului, ștergem sau returnăm datele, în afara celor pe care legea ne obligă să le păstrăm.",
          "Organizația se asigură că are temei legal pentru datele introduse (consimțământ, contract, interes legitim), că își informează persoanele vizate și respectă regulile privind comunicările comerciale, inclusiv dezabonarea.",
          "Pagini publice de donații: pentru paginile de campanie ale unei organizații prelucrăm, ca persoană împuternicită și la instrucțiunile organizației, date tehnice despre vizite: o amprentă zilnică pseudonimizată (calculată din adresa IP, browser și ziua, fără a stoca adresa IP), sursa vizitei (de exemplu rețea socială sau căutare), tipul dispozitivului, țara și dacă s-a deschis formularul de donație. Nu folosim cookie-uri și nu citim sau scriem nimic în dispozitivul tău. Scopul este ca organizația să vadă câți oameni îi susțin campaniile (interes legitim, art. 6 alin. (1) lit. f din GDPR); datele se păstrează 13 luni, apoi se șterg automat, iar vizitele echipelor autentificate și ale roboților nu se numără. Te poți opune activând „Nu mă urmări” (DNT/GPC) în browser sau scriind organizației. Paginile publice de campanie sunt excluse din Google Analytics.",
          "Parcursuri automate de e-mail către donatori (mulțumire după prima sau a doua donație, reluarea unei donații lunare oprite, propunerea unei donații lunare, reconectarea după o perioadă de pauză): le pornește și le editează organizația, ca operator, iar noi le trimitem ca persoană împuternicită. Primesc doar donatorii care au bifat singuri acordul pentru e-mailuri în formularul de donație, nu s-au dezabonat și nu au refuzat contactul; fiecare e-mail are link de dezabonare și numele organizației. Alegerea destinatarilor se face după istoricul donațiilor (de exemplu numărul și data donațiilor), o segmentare simplă, fără efecte juridice; organizația trebuie să informeze donatorii despre ea. La pornirea unui parcurs, organizația confirmă că donatorii au acceptat mesajele, iar confirmarea se păstrează în jurnal. Jurnalul trimiterilor (adresa și pasul trimis) se șterge odată cu donatorul. Adresa de e-mail a unui donator se marchează ca respinsă dacă serverul de e-mail răspunde clar că nu există, sau ca reclamată dacă persoana marchează un mesaj ca spam; marcajul oprește mesajele automate către acea adresă. Fiecare e-mail trimite la o pagină unde donatorul poate alege să primească mesaje mai rar sau deloc.",
          "API și webhook-uri: la cererea organizației (administratorii ei creează cheile și adresele), datele donatorilor și ale donațiilor pot fi citite prin API sau trimise automat la adrese alese de organizație (de exemplu la donația reușită sau la dezabonare). Organizația răspunde de destinatarii pe care îi alege; noi folosim doar chei revocabile, păstrate sub formă de amprentă, și semnăm fiecare trimitere.",
          "Câmpuri personalizate: organizația poate adăuga câmpuri proprii la donatori și la firme și răspunde de datele pe care le introduce în ele (evită datele sensibile, vezi punctul următor).",
          "Donatorii lunari primesc un e-mail cu un link valabil o oră pentru a-și gestiona donația (schimbarea sumei, pauză, oprire, actualizarea cardului); adresa de e-mail este folosită în acest scop (executarea donației), iar organizația este informată despre modificările făcute.",
        ],
      },
      {
        titlu: "10. Date sensibile: cazuri medicale și minori",
        paragrafe: [
          "Unele organizații pot introduce în Platformă date despre sănătate sau despre minori (de exemplu în campanii pentru cazuri medicale). Acestea sunt categorii speciale de date (art. 9 GDPR) sau date care necesită protecție sporită. Organizația răspunde de obținerea consimțământului explicit al persoanei sau al reprezentantului legal, separat pentru date medicale, imagine și poveste, de limitarea datelor la ce este strict necesar și de respectarea dreptului de retragere a consimțământului.",
          "Recomandăm organizațiilor să nu introducă în câmpuri libere mai multe detalii medicale decât este necesar și să analizeze, împreună cu un specialist, necesitatea unei evaluări de impact asupra protecției datelor (DPIA) pentru aceste prelucrări.",
          "Dacă organizația folosește funcția de generare de conținut cu AI (punctul 4), povestea campaniei este transmisă către Anthropic, ca sub-procesator — un motiv în plus să limitezi detaliile medicale din poveste la strictul necesar.",
        ],
      },
      {
        titlu: "11. Cookie-uri",
        paragrafe: ["Folosim cookie-uri strict necesare funcționării (de exemplu sesiunea de autentificare) și, doar cu acordul tău, cookie-uri de analiză. Detalii și opțiuni de gestionare găsești în Politica de cookies. Măsurarea vizitelor pe paginile publice de campanie nu folosește cookie-uri (vezi punctul 9)."],
      },
      {
        titlu: "12. Modificări ale acestei politici",
        paragrafe: ["Putem actualiza această politică; versiunea în vigoare este cea publicată aici, cu data ultimei actualizări. Pentru modificări importante te anunțăm prin email sau în Platformă."],
      },
      {
        titlu: "13. Domeniul de aplicare",
        paragrafe: ["Această politică se aplică site-ului alexandrit.ro și Platformei Alexandrit. Nu răspundem pentru politicile de confidențialitate ale altor site-uri către care pot trimite linkuri (ale organizațiilor partenere sau ale terților); te rugăm să le citești separat."],
      },
    ] satisfies SectiuneLegala[],
  },
  en: {
    homeLabel: "Home",
    eyebrow: "Legal",
    titlu: "Privacy Policy (GDPR)",
    actualizatLabel: "Last updated",
    actualizat: "October 24, 2026",
    sectiuni: [
      {
        titlu: "1. Who we are and in what capacity we process data",
        paragrafe: [
          "MEDIGROUPPLUS SRL (Tax ID 38103518, J07/617/2017, CAEN 7311; registered office: Str. Prieteniei nr. 4, Boscoteni village, Frumușica commune, Botoșani county) operates the Alexandrit platform (the “Platform”) and the alexandrit.ro website and is the data controller for our own data about website visitors, our customers and Platform users (account, subscription, invoicing, communication, consulting).",
          "Alexandrit does not take over personal data from partners. The data of donors, sponsors, volunteers, beneficiaries or employees of a partner organization does not become ours: it stays under the organization's exclusive control, in its isolated space in the Platform; we do not use it for our own purposes, do not disclose it to others and do not combine it with other data. We only provide the technical infrastructure through which the organization manages its own data, as a data processor (see section 9).",
          "Contact for anything concerning personal data: vlad.placinta@alexandrit.ro, phone 0757 401 042.",
        ],
      },
      {
        titlu: "Definitions",
        puncte: [
          "Personal data — any information relating to an identified or identifiable natural person;",
          "Controller — who determines the purposes and means of processing; Processor — who processes data on the controller's behalf;",
          "Customer / Organization — the NGO or other partner creating an account in the Platform;",
          "User — a person accessing the Platform through a Customer's account; Visitor — a person accessing the site without an account;",
          "Site — alexandrit.ro; GDPR — Regulation (EU) 2016/679.",
        ],
      },
      {
        titlu: "2. What data we process as controller",
        paragrafe: ["On the website and in the Platform, for our own purposes, we process data only in the following situations:"],
        puncte: [
          "Contact forms and bookings: name, email, phone, message, chosen slot — to reply to you and organize the consultation;",
          "The “Discover Alexandrit” form (the pop-up on the website and the /descopera page): your name, organization name, email address, phone (if you fill it in), the page you wrote from and, if you came from a campaign, its source (parameters in the link). We keep them in an internal list, visible only to the Alexandrit team, together with the status of the conversation (new, contacted, in discussion, signed up, lost) and internal notes about our conversations, so we can contact you and keep track of requests. If you submit the form several times with the same address, we keep a single record with the number of submissions. A copy of the request also reaches the team by email. Name, organization and email address are needed so we can reply; the phone number is optional. “Source” is the label from the link you came from, used to see which campaigns bring requests. Our internal notes about conversations are personal data about you: you can ask to see them;",
          "Account creation and purchase of services: name, email, role in the organization, password (stored encrypted through the authentication provider), the date and version of the Terms and Privacy Policy you accepted at sign-up, billing details (name, tax ID, address), invoice and subscription history; card data is processed exclusively by the payment processor and never reaches us;",
          "Automatic subscription renewal: if you pay the subscription by card, the payment processor may send us a reusable token and the card's expiry date (not the card number). We store the token encrypted so we can charge the monthly subscription automatically; automatic renewal can be stopped at any time in Settings, and the token is deleted after three failed charge attempts;",
          "Newsletter and marketing communications: email address and preferences, only if you have given consent;",
          "Cookies: cookies needed for operation (session) and, only with your consent, analytics cookies — see the Cookie Policy;",
          "Innovation Center (ideas suggested by organizations): the title, description and “how you do it today” you write, the category, what you want to grow and how often the problem appears, your first name, email address, your organization and the user who suggested or voted for an idea, and reports received about an idea. The idea (text) and the vote count are visible to the other organizations on the Platform; your organization's name shows only if you tick the box, while your first name, email address and who voted are never shown. The Alexandrit team sees the author and email address, so it can tell you when the idea's status changes, and, if you voted for an idea, writes to you 1-to-1 when work starts or it is ready. Please do not write personal data of donors, beneficiaries or colleagues: we do not accept email addresses, phone numbers or personal ID numbers in the text",
          "Website visitors: minimal technical data (IP address, browser type, security and error logs).",
        ],
      },
      {
        titlu: "3. Purposes and legal bases",
        paragrafe: ["We process data for the following purposes, on the following bases:"],
        puncte: [
          "providing the Platform, account, subscription (including its automatic renewal, if you chose card payment) and support — performance of a contract (Art. 6(1)(b) GDPR);",
          "Innovation Center — legitimate interest (Art. 6(1)(f)): to collect, moderate and prioritise the improvement ideas suggested by organizations, to show them to other organizations so they can vote, and to notify you 1-to-1 about your ideas or ideas your organization voted for. The “show my organization's name” box is a publishing choice, not consent. You can object at any time (Art. 21), including by asking for the idea to be withdrawn",
          "keeping proof of acceptance of the Terms and Privacy Policy (date and version) — legitimate interest, so we can prove the contract was concluded (Art. 6(1)(f));",
          "invoicing, accounting and tax obligations — legal obligation (Art. 6(1)(c));",
          "Platform security, abuse prevention and service improvement — legitimate interest (Art. 6(1)(f));",
          "optional marketing communications and analytics cookies — consent (Art. 6(1)(a)), which you can withdraw at any time;",
          "answering requests and booking consultations — pre-contractual steps at your request or legitimate interest;",
          "answering the request sent through the “Discover Alexandrit” form and keeping it in the internal list, with its status and notes — legitimate interest (Art. 6(1)(f)): to answer the request of the organization you represent, not to lose requests and not to contact you several times about the same thing; if you contact us in your own name (for example as a self-employed person), pre-contractual steps at your request (Art. 6(1)(b)). You can object at any time to processing based on legitimate interest (Art. 21), including to being kept in the list. We do not use this data for the newsletter and do not give it to others; general marketing messages are sent only with your separate consent.",
        ],
      },
      {
        titlu: "4. Who we share data with (sub-processors and providers)",
        paragrafe: ["We use technical providers that process data on our behalf or for the services you use, under data processing contracts:"],
        puncte: [
          "Vercel — application and website hosting;",
          "Supabase — database and authentication (EU region);",
          "Stripe — donation payments on campaign pages, directly into each organization's own Stripe account (the platform has no Stripe account and never sees card data);",
          "Netopia Payments — payment of the platform's own subscription (the name and email of the person paying the subscription, on Netopia's hosted payment page; card data stays with Netopia, and we keep only the reusable token for automatic renewal);",
          "Oblio — issuing and sending tax invoices;",
          "the email service of the alexandrit.ro domain, hosted by the platform's web hosting provider (romania-webhosting.com) — account, invoice, thank-you and reminder emails, requests from the “Discover Alexandrit” form to the team and, as data processor, organizations' automated messages to their donors (journeys);",
          "Google — sign-in with your Google account, if you choose that method;",
          "Twilio — calls and messages, where the feature is enabled;",
          "Google Analytics — usage statistics, only with your consent;",
          "Sentry — monitoring of the application's technical errors (error messages and device/browser information; page addresses are stripped of parameters and tokens, and emails and form data are not sent);",
          "Google Fonts and Cloudflare (cdnjs) — fonts and libraries loaded by some tools in the platform's signed-in area (they receive the user's IP address when loading);",
          "Anthropic (Claude) — AI-assisted content generation in the fundraising module (press releases, social media posts, sponsor thank-you messages), based on the campaign's title, story, amounts and, for thank-you messages, the sponsor's name; optional feature, used only when the organization clicks \"Generate with AI\". Likewise, in the company-reports module, the financial documents uploaded by the organization (Trial balance, Balance sheet) and the sponsorship data are sent to Anthropic to extract the figures and draft the report. In the Grants module, the organization's file and the funder's requirements (without the file's contacts and IBAN) are sent to Anthropic to draft funding applications, and the search for calls uses Anthropic's web search;",
          "integration services enabled on a customer's request (for example Make.com, BoldSign, Newsman, Brevo, Mailchimp, Canva) — only for the customer who requests them.",
        ],
        incheiere: ["We do not sell personal data. We may disclose it to authorities only when required by law. The up-to-date list of sub-processors can be requested at any time at the contact details above."],
      },
      {
        titlu: "5. Transfers outside the European Economic Area",
        paragrafe: ["Some providers (for example Stripe, Google, Twilio, Vercel, Anthropic) may also process data outside the EEA, in particular in the USA. In these cases we rely on GDPR safeguards: the adequacy decision on the EU–US Data Privacy Framework for certified providers or standard contractual clauses, together with supplementary measures where necessary. The Platform's database is hosted in the EU."],
      },
      {
        titlu: "6. How long we keep data",
        puncte: [
          "account and organization data: for the duration of the contract. If access expires (trial or subscription) and the account is not reactivated, we permanently delete it 90 days after expiry. Before deletion we send two email warnings (at 60 and 83 days), and the owner can export the data at any time, including after access has expired;",
          "tax and accounting documents (invoices, contracts): under Romanian accounting law, usually 10 years;",
          "card token for automatic renewal: until you remove it in Settings, until the subscription ends, or until the third failed charge attempt, when it is deleted automatically;",
          "proof of acceptance of the Terms and Policy (date and version): for the life of the account and, afterwards, as long as claims related to the contract could arise;",
          "technical and security logs: for short periods strictly necessary;",
          "contact data from requests: as long as needed to reply and thereafter no longer than claims related to the request could arise;",
          "requests from the “Discover Alexandrit” form: if you become a customer, the data moves into your account and follows the rules above; if not, we delete it after at most 24 months from your last submission or the last conversation, or sooner at your request;",
          "Innovation Center: active ideas, for as long as the Platform exists; hidden ideas or ideas with the status “Not now” are deleted after 24 months. When your account is deleted, your first name and the link to the account are removed and the idea may remain, anonymised; when the organization is deleted, the organization's name and the author's first name are removed and the votes and reports are deleted. On request we hide an idea immediately and delete it permanently within 30 days",
          "data entered in the CRM by customer organizations: according to the organization's instructions and retention policies (the controller of that data).",
        ],
      },
      {
        titlu: "7. Your rights",
        paragrafe: [
          "Under the GDPR you have the right of access, rectification, erasure, restriction of processing, portability, objection, and the right not to be subject to a decision based solely on automated processing. You may withdraw consent at any time, without affecting the lawfulness of prior processing.",
          "To exercise your rights write to vlad.placinta@alexandrit.ro; we reply within one month. If your data is in an organization's CRM (for example you are a donor), the request must be addressed to that organization; we will help it respond. If you have an account on the platform, you can delete it yourself at any time from the “My account” page (alexandrit.ro/cont).",
          "You have the right to lodge a complaint with the National Supervisory Authority for Personal Data Processing (ANSPDCP), www.dataprotection.ro.",
        ],
      },
      {
        titlu: "8. Data security",
        paragrafe: [
          "We apply appropriate technical and organizational measures: encrypted connections (HTTPS), strict isolation of data between organizations at database level, role-based access control, security logs, backups, and limited access by our team to customer data, only when necessary for support and under confidentiality.",
          "In case of a personal data breach that poses a risk to data subjects, we notify affected customer organizations without undue delay so they can meet their notification obligations, and the authorities where applicable.",
        ],
      },
      {
        titlu: "9. Partners' data: Alexandrit does not take it over (data processor)",
        paragrafe: [
          "The organization using the Platform is the controller of the data of the people in its CRM (donors, sponsors, volunteers, beneficiaries, employees, contacts) and alone decides the purposes and legal basis of processing, notice to individuals and retention. Alexandrit does not take over this data, does not acquire it and does not use it for its own, marketing or any other purposes.",
          "Our role is strictly technical: we host the application in which the organization enters and manages its data, isolated from other organizations, as a data processor. We do not access an organization's data except at its request, for technical support, or when the law requires us to; we do not disclose it to third parties (other than the technical sub-processors in section 4) and do not combine it with other data.",
          "Under the data processing agreement (DPA, available at alexandrit.ro/dpa and accepted by the organization when creating the account or from Settings) we undertake, among other things, to: keep it confidential; apply appropriate security measures; use sub-processors only with notice to the organization; assist the organization in handling data subjects' rights; notify it without undue delay of incidents; and, at the end of the contract, delete or return the data, except what the law requires us to keep.",
          "The organization ensures it has a legal basis for the data entered (consent, contract, legitimate interest), that it informs its data subjects and follows the rules on commercial communications, including unsubscribing.",
          "Public donation pages: for an organization's campaign pages we process, as a processor and on the organization's instructions, technical visit data: a pseudonymised daily fingerprint (calculated from the IP address, browser and day, without storing the IP address), the visit source (for example social network or search), device type, country and whether the donation form was opened. We use no cookies and read or write nothing on your device. The purpose is for the organization to see how many people support its campaigns (legitimate interest, Art. 6(1)(f) GDPR); the data is kept for 13 months and then deleted automatically, and visits by signed-in team members and by robots are not counted. You can object by turning on “Do Not Track” (DNT/GPC) in your browser or by writing to the organization. Public campaign pages are excluded from Google Analytics.",
          "Automated donor email journeys (thank-you after the first or second donation, resuming a stopped monthly donation, a monthly-donation proposal, reconnecting after a pause): the organization, as controller, starts and edits them, and we send them as data processor. Only donors who themselves ticked consent for emails in the donation form, have not unsubscribed and have not refused contact receive them; each email has an unsubscribe link and the organization's name. Recipients are chosen by donation history (for example the number and date of donations), a simple segmentation without legal effects; the organization must inform its donors about it. When starting a journey, the organization confirms that its donors accepted the messages, and the confirmation is kept in the log. The delivery log (address and step sent) is deleted together with the donor. A donor's email address is marked as rejected if the mail server clearly answers that it does not exist, or as complained if the person marks a message as spam; the mark stops automated messages to that address. Every email links to a page where the donor can choose to receive messages less often or not at all.",
          "API and webhooks: at the organization's request (its administrators create the keys and addresses), donor and donation data can be read through the API or sent automatically to addresses chosen by the organization (for example on a successful donation or an unsubscribe). The organization is responsible for the recipients it chooses; we only use revocable keys, stored as a fingerprint, and sign every delivery.",
          "Custom fields: the organization can add its own fields to donors and companies and is responsible for the data it enters in them (avoid sensitive data, see the next point).",
          "Monthly donors receive an e-mail with a link, valid for one hour, to manage their donation (change the amount, pause, stop, update the card); the e-mail address is used for this purpose (performance of the donation), and the organization is informed of the changes made.",
        ],
      },
      {
        titlu: "10. Sensitive data: medical cases and minors",
        paragrafe: [
          "Some organizations may enter health data or data about minors into the Platform (for example in campaigns for medical cases). These are special categories of data (Art. 9 GDPR) or data needing enhanced protection. The organization is responsible for obtaining the explicit consent of the person or legal representative, separately for medical data, image and story, for limiting the data to what is strictly necessary and for respecting the right to withdraw consent.",
          "We recommend that organizations do not enter more medical detail in free-text fields than necessary and assess, with a specialist, whether a data protection impact assessment (DPIA) is needed for such processing.",
          "If the organization uses the AI content-generation feature (section 4), the campaign story is sent to Anthropic as a sub-processor — one more reason to keep the medical detail in the story to what is strictly necessary.",
        ],
      },
      {
        titlu: "11. Cookies",
        paragrafe: ["We use cookies strictly necessary for operation (for example the authentication session) and, only with your consent, analytics cookies. Details and options are in the Cookie Policy. Measuring visits on public campaign pages uses no cookies (see point 9)."],
      },
      {
        titlu: "12. Changes to this policy",
        paragrafe: ["We may update this policy; the version in force is the one published here with the last-updated date. For important changes we notify you by email or in the Platform."],
      },
      {
        titlu: "13. Scope",
        paragrafe: ["This policy applies to the alexandrit.ro website and the Alexandrit Platform. We are not responsible for the privacy policies of other sites we may link to (of partner organizations or third parties); please read them separately."],
      },
    ] satisfies SectiuneLegala[],
  },
} satisfies Record<Locale, unknown>;
