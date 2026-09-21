import type { Locale } from "../config";

// Termeni și condiții — platforma Alexandrit (CRM pentru ONG-uri), operată de Medigroupplus SRL.
// Proiect de lucru: trebuie verificat de un jurist înainte de a fi considerat definitiv (vezi DraftBanner).
export type SectiuneLegala = { titlu: string; paragrafe?: string[]; puncte?: string[]; incheiere?: string[] };

export const TERMENI_DICT = {
  ro: {
    homeLabel: "Acasă",
    eyebrow: "Legal",
    titlu: "Termeni și condiții",
    actualizatLabel: "Ultima actualizare",
    actualizat: "21 septembrie 2026",
    sectiuni: [
      {
        titlu: "1. Aspecte generale și identificarea operatorului",
        paragrafe: [
          "Site-ul alexandrit.ro și platforma Alexandrit („Platforma”) sunt operate de MEDIGROUPPLUS SRL („Operatorul”, „Furnizorul”, „noi”), societate cu răspundere limitată înființată în anul 2017, înregistrată la Registrul Comerțului sub nr. J07/617/2017, cod unic de înregistrare (CUI) 38103518, cu sediul social în Str. Prieteniei nr. 4, sat Boscoteni, comuna Frumușica, județul Botoșani, România. Obiectul principal de activitate: cod CAEN 7311 — Activități ale agențiilor de publicitate. Contact: vlad.placinta@alexandrit.ro, telefon 0757 401 042.",
          "Acești Termeni și condiții („Termenii”) reglementează accesul la site și folosirea Platformei și cuprind relațiile dintre Operator, pe de o parte, și organizațiile neguvernamentale și alte persoane juridice sau fizice care își creează un cont, pe de altă parte, precum și vizitatorii site-ului. Prin accesarea site-ului, crearea unui cont sau folosirea Platformei confirmi că ai citit și accepți în totalitate acești Termeni. Dacă nu ești de acord, nu poți folosi Platforma.",
          "Punctele cheie: (1) Platforma este un CRM și un set de instrumente de strângere de fonduri, oferit prin abonament; (2) noi nu preluăm datele personale ale partenerilor — datele donatorilor, sponsorilor, voluntarilor sau beneficiarilor unei organizații rămân sub controlul ei, iar noi asigurăm doar infrastructura tehnică; (3) donațiile online ajung direct la organizația beneficiară și nu trec prin conturile noastre; (4) integrările și dezvoltările personalizate nu sunt incluse în abonament și se realizează la cerere.",
        ],
      },
      {
        titlu: "2. Definiții",
        puncte: [
          "Platforma / Serviciul — aplicația web Alexandrit și instrumentele ei, accesibile prin browser, împreună cu serviciile conexe (consiliere, instruire, implementare);",
          "Client / Organizația — persoana juridică sau fizică (în principal ONG) care își creează un cont și încheie contractul de abonament;",
          "Utilizator — persoana care accesează Platforma prin contul Clientului (owner, administrator sau membru);",
          "Cont — spațiul de lucru izolat al Clientului în Platformă, cu utilizatorii și datele lui;",
          "Abonament — dreptul de folosire a Platformei pe o perioadă (lunară sau anuală), în limitele pachetului ales (START, CREȘTERE, IMPACT);",
          "Comandă / Tranzacție — solicitarea și plata unui abonament sau a unui serviciu, prin procesatorul de plăți;",
          "Contract — acordul dintre Operator și Client format din acești Termeni, Politica de confidențialitate (GDPR), Politica de cookies și, după caz, oferta sau acordul de prelucrare a datelor;",
          "Donator — persoana care face o donație către o Organizație prin paginile ei;",
          "Vizitator — orice persoană care accesează site-ul fără a avea cont.",
        ],
      },
      {
        titlu: "3. Descrierea serviciilor",
        paragrafe: ["Prin Platformă punem la dispoziția Clientului, în funcție de pachetul ales:"],
        puncte: [
          "CRM pentru persoane fizice (donatori) și persoane juridice (companii, sponsori), cu istoric de donații și interacțiuni;",
          "instrumente pentru Formularul 230 (redirecționarea a 3,5% din impozit), contracte de sponsorizare (formatele 20% și D177) și rapoarte;",
          "pagini de strângere de fonduri și de donații online pentru cauzele Organizației;",
          "programul de lucru al echipei, taskuri, newsletter, generatoare de materiale și alte instrumente prezentate în Platformă;",
          "consiliere 1 la 1, instruire și materiale educaționale de fundraising;",
          "integrări cu servicii terțe și servicii de implementare, realizate la cerere (vezi punctul 12).",
        ],
        incheiere: [
          "Platforma este un serviciu digital, livrat exclusiv online, prin accesul la contul Clientului; nu presupune livrarea de bunuri fizice. Funcționalitățile disponibile și limitele fiecărui pachet (utilizatori, contacte, companii) sunt cele afișate pe pagina Hub Fundraising la momentul înscrierii. Putem adăuga, modifica sau retrage funcționalități, cu respectarea punctului 15. Suportul tehnic se oferă prin email și telefon, în zilele lucrătoare, la datele de contact de la punctul 1.",
        ],
      },
      {
        titlu: "4. Contul de utilizator și rolurile",
        paragrafe: [
          "Pentru a folosi Platforma este necesar un cont, creat cu o adresă de email validă. Serviciile sunt destinate în principal organizațiilor și profesioniștilor. Persoana care creează contul organizației declară că are dreptul să angajeze Organizația și devine „owner”. Organizația poate invita alți utilizatori, cu roluri diferite (owner, administrator, membru), în limita utilizatorilor incluși în pachet.",
          "Clientul răspunde de păstrarea confidențialității datelor de autentificare, de activitatea desfășurată din conturile utilizatorilor săi și de retragerea accesului persoanelor care nu mai colaborează cu Organizația. Ne poți anunța oricând, la datele de contact de la punctul 1, dacă bănuiești un acces neautorizat; vom lua măsuri de securizare a contului cât mai repede.",
          "Datele introduse în cont trebuie să fie corecte și actuale. Fiecare organizație vede exclusiv datele proprii; datele unei organizații nu sunt accesibile altor organizații.",
        ],
      },
      {
        titlu: "5. Comercializarea serviciilor: abonamente și prețuri",
        paragrafe: [
          "Abonamentele (START, CREȘTERE, IMPACT) se plătesc lunar sau anual, la prețurile în lei afișate pe pagina Hub Fundraising în momentul comenzii; la plata anuală se aplică reducerea afișată („2 luni gratuite”). Prețul final aferent perioadei alese este afișat înainte de plată. Perioada de probă gratuită este de 14 zile, fără card bancar; după probă, accesul continuă doar după alegerea și plata unui pachet.",
          "Abonamentul se reînnoiește automat pentru aceeași perioadă, până la anulare. Îl poți anula oricând, din cont sau prin email; anularea produce efecte de la sfârșitul perioadei deja plătite. Sumele plătite pentru perioada în curs nu se rambursează, cu excepția cazurilor prevăzute de lege sau a unei erori imputabile nouă, având în vedere natura digitală a serviciului, care se furnizează imediat după plată.",
          "Ne rezervăm dreptul de a modifica prețurile pentru perioadele viitoare, cu anunț prealabil de cel puțin 30 de zile. Depășirea limitelor pachetului (utilizatori, contacte, companii) poate fi rezolvată prin trecerea la un pachet superior sau prin opțiunile suplimentare afișate.",
        ],
      },
      {
        titlu: "6. Comanda, plata și facturarea",
        paragrafe: [
          "Plata abonamentului se face online, cu cardul, prin procesatorul de plăți integrat în Platformă, pe pagina lui securizată; datele cardului nu sunt vizualizate și nu sunt stocate de noi. Alte metode (de exemplu transfer bancar) pot fi acceptate la cerere, pe baza unei facturi proforme, cu plata în 14 zile de la emitere.",
          "Factura fiscală se emite electronic, pe datele de facturare transmise de Client (denumire, CUI, adresă), și se trimite pe adresa de email a acestuia; emiterea se face prin serviciul de facturare Oblio. Prețurile includ TVA dacă acesta este aplicabil conform legii. Clientul răspunde de corectitudinea datelor de facturare.",
          "Dacă o plată nu poate fi procesată, îl vom anunța pe Client; după 14 zile de la scadență putem suspenda accesul până la regularizare, iar după 30 de zile de neplată contractul poate înceta, fără a afecta obligațiile de plată scadente.",
        ],
      },
      {
        titlu: "7. Donații online și plăți către Organizații",
        paragrafe: [
          "Platforma permite Organizației să creeze pagini de strângere de fonduri și să primească donații online. Donațiile se fac cu cardul, prin procesatorul de plăți al Organizației sau prin cel integrat în Platformă (de exemplu Stripe), pe pagina securizată a procesatorului.",
          "Beneficiarul donației este Organizația. Noi nu primim, nu păstrăm și nu redistribuim banii donați și nu putem opera rambursări. Orice problemă legată de o donație (confirmare, returnare, eroare) se rezolvă între donator și Organizație, iar termenii procesatorului de plăți se aplică relației dintre procesator, Organizație și donator. Organizația este singura responsabilă pentru informațiile publicate în paginile sale, pentru modul în care folosește sumele primite, pentru documentele emise donatorilor și pentru respectarea legislației aplicabile activității sale.",
        ],
      },
      {
        titlu: "8. Datele personale ale partenerilor: noi nu le preluăm",
        paragrafe: [
          "Alexandrit nu preia, nu achiziționează și nu folosește în scopuri proprii datele cu caracter personal ale donatorilor, sponsorilor, voluntarilor, beneficiarilor sau angajaților organizațiilor partenere. Aceste date rămân sub controlul exclusiv al organizației, care decide ce introduce în Platformă, în ce scop și cât timp le păstrează, și sunt păstrate în spațiul ei izolat de contul altor organizații.",
          "Rolul nostru se limitează la a asigura infrastructura tehnică prin care organizația își gestionează propriile date (persoană împuternicită). Nu comunicăm aceste date altor persoane, nu le combinăm cu alte date și nu le accesăm decât la cererea organizației, pentru suport tehnic, sau atunci când legea ne obligă. Detalii în Politica de confidențialitate (GDPR).",
        ],
      },
      {
        titlu: "9. Drepturile și obligațiile Clientului",
        paragrafe: [
          "Organizația este operator pentru datele persoanelor pe care le introduce în Platformă. Se obligă să aibă temeiul legal necesar (de exemplu consimțământul, contractul sau interesul legitim), să își informeze persoanele vizate, să respecte regulile privind comunicările comerciale (inclusiv dezabonarea) și să nu introducă date pe care nu are dreptul să le prelucreze. Pentru date speciale, în special date medicale și date despre minori, Organizația răspunde de obținerea consimțământului explicit și a acordului reprezentantului legal.",
          "Clientul răspunde de legalitatea și exactitatea conținutului și a datelor introduse, de modul în care folosește Platforma și de deciziile luate pe baza ei. Are dreptul de a folosi Platforma în limitele pachetului, de a primi suport tehnic de bază și de a-și exporta datele.",
        ],
      },
      {
        titlu: "10. Utilizare acceptabilă",
        paragrafe: ["Este interzis să folosești Platforma pentru:"],
        puncte: [
          "activități ilegale, înșelătorii sau strângeri de fonduri în scopuri false sau înșelătoare;",
          "trimiterea de mesaje nesolicitate (spam) sau prelucrarea de date personale fără temei legal;",
          "încercări de acces la conturile sau la datele altor organizații, introducerea de programe dăunătoare, ocolirea măsurilor de securitate sau suprasolicitarea sistemelor;",
          "folosirea unei identități false sau a identității altei persoane;",
          "copierea, revânzarea sau redistribuirea Platformei ori a materialelor ei fără acordul nostru.",
        ],
        incheiere: ["Putem suspenda sau bloca un cont care încalcă acești Termeni, fără notificare prealabilă atunci când riscul o impune, urmând să comunicăm motivele în cel mai scurt timp posibil."],
      },
      {
        titlu: "11. Datele Clientului, export și ștergere",
        paragrafe: [
          "Datele introduse de Client în Platformă rămân proprietatea Clientului. Ne acorzi doar dreptul de a le stoca și prelucra pentru a-ți furniza serviciile. Poți exporta datele (CSV/Excel) cât timp contul este activ.",
          "La încetarea contractului, datele Clientului sunt șterse sau anonimizate într-un termen rezonabil, după ce Clientul are posibilitatea de a le exporta, cu excepția datelor pe care suntem obligați să le păstrăm conform legii (de exemplu documente contabile și fiscale).",
        ],
      },
      {
        titlu: "12. Integrări, servicii la cerere și termeni specifici",
        paragrafe: [
          "Integrările cu servicii terțe (de exemplu platforme de email marketing, automatizări, procesatori de plăți, facturare, semnătură electronică, website) și dezvoltările personalizate nu sunt incluse în prețul abonamentului. Se realizează doar la cerere, pe baza unei oferte separate care descrie ce se livrează, în ce termen și la ce preț; ofertele acceptate pot avea termeni specifici, care completează acești Termeni și au prioritate în ce privește serviciul respectiv.",
          "Serviciile terților sunt guvernate de termenii și de prețurile furnizorilor respectivi, pe care Clientul trebuie să le accepte separat. Nu răspundem pentru funcționarea, disponibilitatea sau modificările serviciilor terților.",
        ],
      },
      {
        titlu: "13. Drepturi de autor și proprietate intelectuală",
        paragrafe: [
          "Platforma, codul ei, designul, textele, șabloanele, ghidurile și celelalte materiale sunt protejate de Legea nr. 8/1996 privind dreptul de autor și drepturile conexe și rămân proprietatea Medigroupplus SRL sau a licențiatorilor săi. Clientul primește un drept de folosință personal, neexclusiv și netransmisibil, pe durata abonamentului activ. Este interzisă folosirea elementelor Platformei fără acordul nostru scris.",
          "Materialele încărcate de Client (texte, imagini, sigle) rămân ale lui. Ne acordă un drept neexclusiv de a le afișa în Platformă și în paginile create de el, strict pentru furnizarea serviciului. Clientul garantează că are dreptul de a folosi aceste materiale și că nu încalcă drepturile altora.",
        ],
      },
      {
        titlu: "14. Confidențialitate și securitate",
        paragrafe: [
          "Păstrăm confidențialitatea informațiilor Clientului și aplicăm măsuri tehnice și organizatorice adecvate pentru securitatea Platformei, conform Politicii de confidențialitate (GDPR). Clientul răspunde de securitatea parolelor și a dispozitivelor folosite și are obligația de a ne anunța imediat orice acces neautorizat sau încălcare a securității de care află.",
        ],
      },
      {
        titlu: "15. Disponibilitate și modificarea Platformei",
        paragrafe: [
          "Depunem eforturi continue pentru ca Platforma să funcționeze fără întreruperi, dar nu garantăm disponibilitate neîntreruptă. Putem efectua lucrări de mentenanță și putem modifica, suspenda sau retrage funcționalități atunci când considerăm necesar, cu anunț rezonabil ori de câte ori este posibil. Funcționalitățile noi se supun acelorași Termeni, dacă nu se prevede altfel.",
        ],
      },
      {
        titlu: "16. Garanții și limitarea răspunderii",
        paragrafe: [
          "Platforma este furnizată „ca atare”, fără alte garanții decât cele impuse de lege. Este un instrument: nu garantăm un anumit volum de donații, sponsorizări sau alte rezultate ale activității de fundraising. Nu răspundem pentru modul în care Organizațiile folosesc sumele strânse, pentru conținutul publicat de acestea, pentru deciziile luate pe baza datelor din Platformă sau pentru funcționarea serviciilor terților.",
          "În limita permisă de lege, răspunderea noastră totală față de Client pentru orice pretenție legată de Platformă nu depășește valoarea abonamentului plătit în ultimele 12 luni și nu include daune indirecte sau beneficii nerealizate. Nicio clauză din acest document nu limitează răspunderea care nu poate fi limitată conform legii.",
        ],
      },
      {
        titlu: "17. Forța majoră",
        paragrafe: ["Nicio parte nu răspunde pentru neexecutarea obligațiilor dacă aceasta este cauzată de un eveniment de forță majoră, conform legii. Partea care invocă forța majoră o notifică pe cealaltă în cel mai scurt timp posibil și depune diligențele pentru limitarea efectelor."],
      },
      {
        titlu: "18. Încetarea contractului",
        paragrafe: ["Contractul încetează:"],
        puncte: [
          "prin acordul părților;",
          "prin anularea abonamentului de către Client, la sfârșitul perioadei plătite;",
          "prin încălcarea gravă a Termenilor de către una dintre părți, după o notificare rămasă fără efect;",
          "în caz de neplată, în condițiile punctului 6;",
          "în caz de insolvență sau încetare a activității uneia dintre părți;",
          "la solicitarea unei autorități competente.",
        ],
        incheiere: ["Dispozițiile care, prin natura lor, trebuie să rămână în vigoare după încetare (proprietate intelectuală, confidențialitate, răspundere, legea aplicabilă) continuă să se aplice. Încetarea nu afectează obligațiile de plată scadente."],
      },
      {
        titlu: "19. Linkuri către alte site-uri",
        paragrafe: ["Platforma și paginile create prin ea pot conține linkuri către site-uri ale Organizațiilor sau ale terților. Includerea unui link nu înseamnă că susținem conținutul sau opiniile de pe acel site."],
      },
      {
        titlu: "20. Protecția datelor și cookie-uri",
        paragrafe: ["Modul în care prelucrăm date personale este descris în Politica de confidențialitate (GDPR), iar cookie-urile sunt descrise în Politica de cookies. Ambele fac parte din acești Termeni."],
      },
      {
        titlu: "21. Legea aplicabilă și soluționarea litigiilor",
        paragrafe: ["Acești Termeni sunt guvernați de legea română. Orice neînțelegere se rezolvă în primul rând pe cale amiabilă; dacă nu este posibil, litigiul se soluționează de instanțele judecătorești competente de la sediul Operatorului, din România."],
      },
      {
        titlu: "22. Dispoziții finale și contact",
        paragrafe: [
          "Putem actualiza acești Termeni, de exemplu pentru schimbări legislative sau ale serviciilor. Versiunea în vigoare este cea publicată aici, cu data ultimei actualizări; pentru modificări importante te anunțăm prin email sau în Platformă. Continuarea utilizării după publicare înseamnă acceptarea noii versiuni. Campaniile sau ofertele speciale pot avea condiții suplimentare, care se aplică cu prioritate. Dacă o clauză este nulă sau inaplicabilă, restul Termenilor rămâne valabil.",
          "Pentru orice întrebare sau sesizare: MEDIGROUPPLUS SRL, CUI 38103518, J07/617/2017, Str. Prieteniei nr. 4, sat Boscoteni, comuna Frumușica, județul Botoșani — email vlad.placinta@alexandrit.ro, telefon 0757 401 042 (suport tehnic: andrei.placinta@alexandrit.ro, 0721 425 650).",
        ],
      },
    ] satisfies SectiuneLegala[],
  },
  en: {
    homeLabel: "Home",
    eyebrow: "Legal",
    titlu: "Terms and Conditions",
    actualizatLabel: "Last updated",
    actualizat: "September 21, 2026",
    sectiuni: [
      {
        titlu: "1. General aspects and operator identification",
        paragrafe: [
          "The alexandrit.ro website and the Alexandrit platform (the “Platform”) are operated by MEDIGROUPPLUS SRL (the “Operator”, the “Provider”, “we”), a limited liability company established in 2017, registered with the Trade Registry under no. J07/617/2017, Tax ID (CUI) 38103518, with its registered office at Str. Prieteniei nr. 4, Boscoteni village, Frumușica commune, Botoșani county, Romania. Main activity: CAEN code 7311 — advertising agencies. Contact: vlad.placinta@alexandrit.ro, phone 0757 401 042.",
          "These Terms and Conditions (the “Terms”) govern access to the site and use of the Platform and cover the relationship between the Operator and non-governmental organizations and other legal or natural persons who create an account, as well as site visitors. By accessing the site, creating an account or using the Platform you confirm that you have read and fully accept these Terms. If you do not agree, you may not use the Platform.",
          "Key points: (1) the Platform is a CRM and a set of fundraising tools offered by subscription; (2) we do not take over partners' personal data — the data of an organization's donors, sponsors, volunteers or beneficiaries stays under its control and we only provide the technical infrastructure; (3) online donations go directly to the beneficiary organization and do not pass through our accounts; (4) integrations and custom development are not included in the subscription and are carried out on request.",
        ],
      },
      {
        titlu: "2. Definitions",
        puncte: [
          "Platform / Service — the Alexandrit web application and its tools, accessible through a browser, together with related services (consulting, training, implementation);",
          "Customer / Organization — the legal or natural person (mainly an NGO) who creates an account and concludes the subscription contract;",
          "User — a person accessing the Platform through the Customer's account (owner, administrator or member);",
          "Account — the Customer's isolated workspace in the Platform, with its users and data;",
          "Subscription — the right to use the Platform for a period (monthly or annual), within the limits of the chosen plan (START, CREȘTERE, IMPACT);",
          "Order / Transaction — the request and payment of a subscription or service through the payment processor;",
          "Contract — the agreement between Operator and Customer made up of these Terms, the Privacy Policy (GDPR), the Cookie Policy and, where applicable, the offer or data processing agreement;",
          "Donor — a person making a donation to an Organization through its pages;",
          "Visitor — anyone accessing the site without an account.",
        ],
      },
      {
        titlu: "3. Description of services",
        paragrafe: ["Depending on the plan chosen, the Platform provides the Customer with:"],
        puncte: [
          "a CRM for individuals (donors) and companies (sponsors), with donation and interaction history;",
          "tools for Form 230 (redirecting 3.5% of income tax), sponsorship contracts (20% and D177 formats) and reports;",
          "fundraising and online donation pages for the Organization's causes;",
          "team work schedule, tasks, newsletter, material generators and other tools shown in the Platform;",
          "1-on-1 consulting, training and fundraising educational materials;",
          "integrations with third-party services and implementation services, carried out on request (see section 12).",
        ],
        incheiere: [
          "The Platform is a digital service delivered exclusively online through access to the Customer's account; it involves no delivery of physical goods. Available features and plan limits (users, contacts, companies) are those shown on the Fundraising Hub page at sign-up. We may add, change or withdraw features in line with section 15. Technical support is offered by email and phone on business days at the contact details in section 1.",
        ],
      },
      {
        titlu: "4. User account and roles",
        paragrafe: [
          "An account with a valid email address is required. The services are aimed mainly at organizations and professionals. The person creating the organization's account declares they may bind the Organization and becomes the “owner”. The Organization may invite other users with different roles (owner, administrator, member), within the users included in the plan.",
          "The Customer is responsible for keeping login details confidential, for activity under its users' accounts and for removing access of people who no longer work with the Organization. Tell us at the contact details in section 1 if you suspect unauthorized access; we will secure the account as soon as possible.",
          "Data entered must be accurate and current. Each organization sees only its own data; one organization's data is not accessible to others.",
        ],
      },
      {
        titlu: "5. Commercialization of services: subscriptions and prices",
        paragrafe: [
          "Subscriptions (START, CREȘTERE, IMPACT) are paid monthly or annually at the prices in lei shown on the Fundraising Hub page when ordering; annual payment carries the displayed discount (“2 months free”). The final price for the chosen period is shown before payment. The free trial is 14 days, no bank card required; after the trial, access continues only after choosing and paying for a plan.",
          "The subscription renews automatically for the same period until cancelled. You may cancel at any time, from the account or by email; cancellation takes effect at the end of the period already paid. Amounts paid for the current period are not refunded, except where required by law or in case of an error attributable to us, given the digital nature of the service, which is provided immediately after payment.",
          "We may change prices for future periods with at least 30 days' notice. Exceeding plan limits (users, contacts, companies) can be resolved by moving to a higher plan or through the additional options shown.",
        ],
      },
      {
        titlu: "6. Order, payment and invoicing",
        paragrafe: [
          "Payment is made online by card through the payment processor integrated in the Platform, on its secure page; we do not see or store card data. Other methods (for example bank transfer) may be accepted on request, against a proforma invoice, payable within 14 days of issue.",
          "The tax invoice is issued electronically on the billing details you provide (name, tax ID, address) and sent to your email; invoicing is done through the Oblio invoicing service. Prices include VAT if applicable by law. The Customer is responsible for the accuracy of the billing details.",
          "If a payment cannot be processed we will inform the Customer; 14 days after the due date we may suspend access until settled, and after 30 days of non-payment the contract may end, without affecting payment obligations already due.",
        ],
      },
      {
        titlu: "7. Online donations and payments to Organizations",
        paragrafe: [
          "The Platform lets the Organization create fundraising pages and receive online donations. Donations are made by card through the Organization's own payment processor or the one integrated in the Platform (for example Stripe), on the processor's secure page.",
          "The beneficiary of a donation is the Organization. We do not receive, hold or redistribute donated money and cannot issue refunds. Any issue with a donation (confirmation, refund, error) is resolved between the donor and the Organization, and the payment processor's terms apply to the relationship between the processor, the Organization and the donor. The Organization is solely responsible for the information published on its pages, for how it uses the funds received, for documents issued to donors and for compliance with the law applicable to its activity.",
        ],
      },
      {
        titlu: "8. Partners' personal data: we do not take it over",
        paragrafe: [
          "Alexandrit does not take over, acquire or use for its own purposes the personal data of donors, sponsors, volunteers, beneficiaries or employees of partner organizations. This data stays under the organization's exclusive control, which decides what it enters into the Platform, for what purpose and for how long it keeps it, and is kept in its space, isolated from other organizations' accounts.",
          "Our role is limited to providing the technical infrastructure through which the organization manages its own data (data processor). We do not disclose this data to others, do not combine it with other data and access it only at the organization's request, for technical support, or when the law requires us to. Details are in the Privacy Policy (GDPR).",
        ],
      },
      {
        titlu: "9. The Customer's rights and obligations",
        paragrafe: [
          "The Organization is the controller of the data of the people it enters into the Platform. It must have the necessary legal basis (for example consent, contract or legitimate interest), inform its data subjects, follow the rules on commercial communications (including unsubscribing) and not enter data it has no right to process. For special categories, in particular medical data and data about minors, the Organization is responsible for obtaining explicit consent and the legal representative's agreement.",
          "The Customer is responsible for the legality and accuracy of the content and data entered, for how it uses the Platform and for decisions taken based on it. It has the right to use the Platform within the plan limits, to receive basic technical support and to export its data.",
        ],
      },
      {
        titlu: "10. Acceptable use",
        paragrafe: ["You must not use the Platform for:"],
        puncte: [
          "illegal activities, fraud, or fundraising for false or misleading purposes;",
          "sending unsolicited messages (spam) or processing personal data without a legal basis;",
          "attempts to access other organizations' accounts or data, introducing malicious software, bypassing security measures or overloading systems;",
          "using a false identity or another person's identity;",
          "copying, reselling or redistributing the Platform or its materials without our consent.",
        ],
        incheiere: ["We may suspend or block an account that breaches these Terms, without prior notice where the risk requires it, and will communicate the reasons as soon as possible."],
      },
      {
        titlu: "11. Customer data, export and deletion",
        paragrafe: [
          "Data entered by the Customer remains the Customer's property. You grant us only the right to store and process it to provide the services. You can export your data (CSV/Excel) while the account is active.",
          "When the contract ends, the Customer's data is deleted or anonymized within a reasonable time, after the Customer has had the opportunity to export it, except for data we must keep by law (for example accounting and tax records).",
        ],
      },
      {
        titlu: "12. Integrations, on-request services and specific terms",
        paragrafe: [
          "Integrations with third-party services (for example email marketing, automation, payment processors, invoicing, e-signature, website) and custom development are not included in the subscription price. They are carried out only on request, under a separate quote describing what is delivered, when and at what price; accepted quotes may have specific terms that supplement these Terms and prevail for that service.",
          "Third-party services are governed by those providers' terms and prices, which the Customer must accept separately. We are not responsible for the operation, availability or changes of third-party services.",
        ],
      },
      {
        titlu: "13. Copyright and intellectual property",
        paragrafe: [
          "The Platform, its code, design, texts, templates, guides and other materials are protected by Law no. 8/1996 on copyright and related rights and remain the property of Medigroupplus SRL or its licensors. The Customer receives a personal, non-exclusive, non-transferable right of use for the duration of the active subscription. Using elements of the Platform without our written consent is prohibited.",
          "Materials uploaded by the Customer (texts, images, logos) remain its own. It grants us a non-exclusive right to display them in the Platform and on the pages it creates, strictly to provide the service. The Customer warrants it has the right to use these materials and does not infringe others' rights.",
        ],
      },
      {
        titlu: "14. Confidentiality and security",
        paragrafe: ["We keep the Customer's information confidential and apply appropriate technical and organizational measures for the security of the Platform, under the Privacy Policy (GDPR). The Customer is responsible for the security of passwords and devices used and must immediately tell us of any unauthorized access or security breach it becomes aware of."],
      },
      {
        titlu: "15. Availability and changes to the Platform",
        paragrafe: ["We work continuously to keep the Platform running without interruption but do not guarantee uninterrupted availability. We may perform maintenance and may change, suspend or withdraw features when we consider it necessary, with reasonable notice where possible. New features are subject to the same Terms unless stated otherwise."],
      },
      {
        titlu: "16. Warranties and limitation of liability",
        paragrafe: [
          "The Platform is provided “as is”, without warranties other than those required by law. It is a tool: we do not guarantee any volume of donations, sponsorships or other fundraising results. We are not liable for how Organizations use the funds raised, for the content they publish, for decisions taken based on data in the Platform or for the operation of third-party services.",
          "To the extent permitted by law, our total liability to the Customer for any claim related to the Platform does not exceed the subscription fees paid in the last 12 months and does not include indirect damages or lost profits. Nothing in this document limits liability that cannot be limited by law.",
        ],
      },
      {
        titlu: "17. Force majeure",
        paragrafe: ["Neither party is liable for failure to perform its obligations if caused by a force majeure event, as defined by law. The party invoking force majeure notifies the other as soon as possible and uses due diligence to limit the effects."],
      },
      {
        titlu: "18. Termination of the contract",
        paragrafe: ["The contract ends:"],
        puncte: [
          "by agreement of the parties;",
          "by the Customer cancelling the subscription, at the end of the paid period;",
          "by serious breach of the Terms by one party, after a notice left without effect;",
          "in case of non-payment, under section 6;",
          "in case of insolvency or cessation of activity of one party;",
          "at the request of a competent authority.",
        ],
        incheiere: ["Provisions which by their nature must survive termination (intellectual property, confidentiality, liability, governing law) continue to apply. Termination does not affect payment obligations already due."],
      },
      {
        titlu: "19. Links to other sites",
        paragrafe: ["The Platform and pages created through it may contain links to Organizations' or third parties' sites. Including a link does not mean we endorse the content or opinions on that site."],
      },
      {
        titlu: "20. Data protection and cookies",
        paragrafe: ["How we process personal data is described in the Privacy Policy (GDPR), and cookies in the Cookie Policy. Both form part of these Terms."],
      },
      {
        titlu: "21. Governing law and disputes",
        paragrafe: ["These Terms are governed by Romanian law. Any dispute is first resolved amicably; if that is not possible, it is settled by the competent courts at the Operator's registered office, in Romania."],
      },
      {
        titlu: "22. Final provisions and contact",
        paragrafe: [
          "We may update these Terms, for example for legal or service changes. The version in force is the one published here with the last-updated date; for important changes we notify you by email or in the Platform. Continued use after publication means acceptance of the new version. Special campaigns or offers may carry additional conditions, which apply with priority. If a clause is void or unenforceable, the rest of the Terms remains valid.",
          "For any question or complaint: MEDIGROUPPLUS SRL, Tax ID 38103518, J07/617/2017, Str. Prieteniei nr. 4, Boscoteni village, Frumușica commune, Botoșani county — email vlad.placinta@alexandrit.ro, phone 0757 401 042 (technical support: andrei.placinta@alexandrit.ro, 0721 425 650).",
        ],
      },
    ] satisfies SectiuneLegala[],
  },
} satisfies Record<Locale, unknown>;
