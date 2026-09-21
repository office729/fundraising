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
        titlu: "1. Cine suntem și despre acest document",
        paragrafe: [
          "Site-ul alexandrit.ro și platforma Alexandrit („Platforma”) sunt operate de MEDIGROUPPLUS SRL („Operatorul”, „noi”), societate înființată la 17 august 2017, având CUI 38103518 și număr de înregistrare la Registrul Comerțului J07/617/2017. Sediul social: [DE COMPLETAT — adresa sediului social].",
          "Acești Termeni și condiții descriu cum poate fi folosită Platforma de către organizațiile neguvernamentale și alte persoane juridice sau fizice care își creează un cont („Clientul” sau „Organizația”) și de către utilizatorii lor, ce oferim noi și ce solicităm în schimb. Te rugăm să îi citești cu atenție: prin crearea unui cont sau prin folosirea Platformei confirmi că i-ai citit și că îi accepți. Dacă nu ești de acord, nu poți folosi Platforma.",
          "Punctele cheie: (1) Platforma este un CRM și un set de instrumente pentru strângerea de fonduri, oferit prin abonament; (2) datele introduse de Organizație rămân ale Organizației, iar noi le prelucrăm ca persoană împuternicită; (3) donațiile online ajung direct la Organizația beneficiară, nu trec prin conturile noastre; (4) integrările și dezvoltările personalizate nu sunt incluse în abonament și se realizează la cerere.",
        ],
      },
      {
        titlu: "2. Serviciile oferite",
        paragrafe: ["Prin Platformă punem la dispoziția Clientului, în funcție de pachetul ales:"],
        puncte: [
          "CRM pentru persoane fizice (donatori) și persoane juridice (companii, sponsori), cu istoric de donații și interacțiuni;",
          "instrumente pentru Formularul 230 (redirecționarea a 3,5% din impozit), contracte de sponsorizare (formatele 20% și D177) și rapoarte;",
          "pagini de strângere de fonduri și de donații online pentru cauzele Organizației;",
          "programul de lucru al echipei, taskuri, newsletter, generatoare de materiale și alte instrumente prezentate în Platformă;",
          "consiliere 1 la 1, instruire și materiale educaționale de fundraising;",
          "integrări cu servicii terțe și servicii de implementare, realizate la cerere (vezi punctul 9).",
        ],
        incheiere: ["Funcționalitățile disponibile și limitele fiecărui pachet (utilizatori, contacte, companii) sunt cele afișate pe pagina Hub Fundraising la momentul înscrierii. Putem adăuga, modifica sau retrage funcționalități, cu respectarea punctului 11."],
      },
      {
        titlu: "3. Cont, utilizatori și roluri",
        paragrafe: [
          "Pentru a folosi Platforma este necesar un cont, creat cu o adresă de email validă. Persoana care creează contul organizației declară că are dreptul să angajeze Organizația și devine „owner”. Organizația poate invita alți utilizatori, cu roluri diferite (owner, administrator, membru), în limita utilizatorilor incluși în pachet.",
          "Clientul răspunde de păstrarea confidențialității datelor de autentificare, de activitatea desfășurată din conturile utilizatorilor săi și de retragerea accesului persoanelor care nu mai colaborează cu Organizația. Ne poți anunța oricând, la datele de contact de la punctul 17, dacă bănuiești un acces neautorizat.",
          "Datele introduse în cont trebuie să fie corecte și actuale. Fiecare organizație vede exclusiv datele proprii; datele unei organizații nu sunt accesibile altor organizații.",
        ],
      },
      {
        titlu: "4. Abonamente, prețuri și facturare",
        paragrafe: [
          "Abonamentele (START, CREȘTERE, IMPACT) se plătesc lunar sau anual, la prețurile în lei afișate pe pagina Hub Fundraising în momentul comenzii; la plata anuală se aplică reducerea afișată („2 luni gratuite”). Perioada de probă gratuită este de 14 zile, fără card bancar. La finalul perioadei de probă, accesul continuă doar după alegerea și plata unui pachet.",
          "Plata abonamentului se face online, prin procesatorul de plăți integrat în Platformă. Factura fiscală se emite electronic, pe datele de facturare transmise de Client (denumire, CUI, adresă), și se trimite pe adresa de email a acestuia; emiterea se face prin serviciul de facturare Oblio. Prețurile pot include TVA, dacă este aplicabil conform legii.",
          "Abonamentul se reînnoiește automat pentru aceeași perioadă, până la anulare. Îl poți anula oricând; anularea produce efecte de la sfârșitul perioadei deja plătite, iar sumele plătite pentru perioada în curs nu se rambursează, cu excepția cazurilor prevăzute de lege sau a unei erori imputabile nouă. Dacă plata nu se poate procesa, putem suspenda accesul până la regularizare.",
          "Depășirea limitelor pachetului (utilizatori, contacte, companii) poate fi rezolvată prin trecerea la un pachet superior sau prin opțiunile suplimentare afișate. Ne rezervăm dreptul de a modifica prețurile pentru perioadele viitoare, cu anunț prealabil de cel puțin 30 de zile.",
        ],
      },
      {
        titlu: "5. Donații online și plăți către Organizații",
        paragrafe: [
          "Platforma permite Organizației să creeze pagini de strângere de fonduri și să primească donații online. Donațiile se fac cu cardul, prin procesatorul de plăți al Organizației sau prin cel integrat în Platformă (de exemplu Stripe), pe pagina securizată a procesatorului; datele cardului nu sunt vizualizate și nu sunt stocate de noi.",
          "Beneficiarul donației este Organizația. Noi nu primim, nu păstrăm și nu redistribuim banii donați și nu putem opera rambursări. Orice problemă legată de o donație (confirmare, returnare, eroare) se rezolvă între donator și Organizație, iar termenii procesatorului de plăți se aplică relației dintre procesator, Organizație și donator.",
          "Organizația este singura responsabilă pentru informațiile publicate în paginile sale, pentru modul în care folosește sumele primite, pentru emiterea documentelor către donatori și pentru respectarea legislației aplicabile activității sale.",
        ],
      },
      {
        titlu: "6. Responsabilitățile Organizației privind datele personale",
        paragrafe: [
          "Pentru datele personale ale donatorilor, voluntarilor, beneficiarilor, angajaților și contactelor introduse în Platformă, Organizația este operator de date, iar Medigroupplus SRL acționează ca persoană împuternicită, conform Politicii de confidențialitate (GDPR) și acordului de prelucrare aplicabil.",
          "Organizația se obligă să aibă temeiul legal necesar pentru datele pe care le introduce sau le importă (de exemplu consimțământul, contractul sau interesul legitim), să își informeze persoanele vizate, să respecte regulile privind comunicările comerciale (inclusiv dezabonarea) și să nu introducă date pe care nu are dreptul să le prelucreze. Pentru datele speciale, în special date medicale și date despre minori, Organizația răspunde de obținerea consimțământului explicit și a acordului reprezentantului legal.",
        ],
      },
      {
        titlu: "7. Utilizare acceptabilă",
        paragrafe: ["Este interzis să folosești Platforma pentru:"],
        puncte: [
          "activități ilegale, înșelătorii sau strângeri de fonduri în scopuri false sau înșelătoare;",
          "trimiterea de mesaje nesolicitate (spam) sau prelucrarea de date personale fără temei legal;",
          "încercări de acces la conturile sau la datele altor organizații, de ocolire a măsurilor de securitate sau de suprasolicitare a sistemelor;",
          "copierea, revânzarea sau redistribuirea Platformei ori a materialelor ei fără acordul nostru.",
        ],
        incheiere: ["Putem suspenda sau închide un cont care încalcă acești termeni, fără notificare prealabilă atunci când riscul o impune, urmând să comunicăm motivele în cel mai scurt timp posibil."],
      },
      {
        titlu: "8. Datele Clientului, export și ștergere",
        paragrafe: [
          "Datele introduse de Client în Platformă rămân proprietatea Clientului. Ne acorzi doar dreptul de a le stoca și prelucra pentru a-ți furniza serviciile. Poți exporta datele (CSV/Excel) cât timp contul este activ.",
          "La încetarea contractului, datele Clientului sunt șterse sau anonimizate într-un termen rezonabil, după ce Clientul are posibilitatea de a le exporta, cu excepția datelor pe care suntem obligați să le păstrăm conform legii (de exemplu documente contabile și fiscale).",
        ],
      },
      {
        titlu: "9. Integrări și servicii la cerere",
        paragrafe: [
          "Integrările cu servicii terțe (de exemplu platforme de email marketing, automatizări, procesatori de plăți, facturare, semnătură electronică, website) și dezvoltările personalizate nu sunt incluse în prețul abonamentului. Se realizează doar la cerere, pe baza unei oferte separate care descrie ce se livrează, în ce termen și la ce preț.",
          "Serviciile terților sunt guvernate de termenii și de prețurile furnizorilor respectivi, pe care Clientul trebuie să le accepte separat. Nu răspundem pentru funcționarea, disponibilitatea sau modificările serviciilor terților.",
        ],
      },
      {
        titlu: "10. Proprietate intelectuală",
        paragrafe: [
          "Platforma, codul ei, designul, textele, șabloanele, ghidurile și celelalte materiale sunt protejate de Legea nr. 8/1996 privind dreptul de autor și drepturile conexe și rămân proprietatea Medigroupplus SRL sau a licențiatorilor săi. Clientul primește un drept de folosință personal, neexclusiv și netransmisibil, pe durata abonamentului activ.",
          "Denumirea, sigla și celelalte semne distinctive ale Organizației rămân ale acesteia; ne permiți să le afișăm în Platformă și în paginile create de tine, în scopul furnizării serviciului.",
        ],
      },
      {
        titlu: "11. Disponibilitate și modificarea Platformei",
        paragrafe: [
          "Depunem eforturi continue pentru ca Platforma să funcționeze fără întreruperi, dar nu garantăm disponibilitate neîntreruptă. Putem efectua lucrări de mentenanță și putem modifica, suspenda sau retrage funcționalități atunci când considerăm necesar, cu anunț rezonabil ori de câte ori este posibil. Funcționalitățile noi se supun acelorași termeni, dacă nu se prevede altfel.",
        ],
      },
      {
        titlu: "12. Limitarea răspunderii",
        paragrafe: [
          "Platforma este un instrument; nu garantăm un anumit volum de donații, sponsorizări sau alte rezultate ale activității de fundraising. Nu răspundem pentru modul în care Organizațiile folosesc sumele strânse, pentru conținutul publicat de acestea sau pentru deciziile luate pe baza datelor din Platformă.",
          "În limita permisă de lege, răspunderea noastră totală față de Client pentru orice pretenție legată de Platformă nu depășește valoarea abonamentului plătit în ultimele 12 luni și nu include daune indirecte sau beneficii nerealizate. Nicio clauză din acest document nu limitează răspunderea care nu poate fi limitată conform legii.",
        ],
      },
      {
        titlu: "13. Suspendare și încetare",
        paragrafe: [
          "Poți înceta oricând utilizarea Platformei, prin anularea abonamentului și, la cerere, prin ștergerea contului. Putem suspenda sau închide contul în caz de încălcare a acestor termeni, de neplată sau de solicitare a unei autorități competente. Dispozițiile care, prin natura lor, trebuie să rămână în vigoare după încetare (proprietate intelectuală, răspundere, legea aplicabilă) continuă să se aplice.",
        ],
      },
      {
        titlu: "14. Linkuri către alte site-uri",
        paragrafe: ["Platforma și paginile create prin ea pot conține linkuri către site-uri ale Organizațiilor sau ale terților. Includerea unui link nu înseamnă că susținem conținutul sau opiniile de pe acel site."],
      },
      {
        titlu: "15. Protecția datelor și cookie-uri",
        paragrafe: ["Modul în care prelucrăm date personale este descris în Politica de confidențialitate (GDPR), iar cookie-urile sunt descrise în Politica de cookies. Ambele fac parte din acești termeni."],
      },
      {
        titlu: "16. Legea aplicabilă și soluționarea litigiilor",
        paragrafe: [
          "Acești termeni sunt guvernați de legea română. Orice neînțelegere se rezolvă în primul rând pe cale amiabilă; dacă nu este posibil, litigiul se soluționează de instanțele judecătorești competente din România.",
        ],
      },
      {
        titlu: "17. Modificarea termenilor și contact",
        paragrafe: [
          "Putem actualiza acești termeni, de exemplu pentru schimbări legislative sau ale serviciilor. Versiunea în vigoare este cea publicată aici, cu data ultimei actualizări; pentru modificări importante te anunțăm prin email sau în Platformă. Continuarea utilizării după publicare înseamnă acceptarea noii versiuni.",
          "Pentru orice întrebare sau sesizare legată de Platformă: MEDIGROUPPLUS SRL, CUI 38103518, J07/617/2017 — email vlad.placinta@alexandrit.ro, telefon 0757 401 042 (suport tehnic: andrei.placinta@alexandrit.ro, 0721 425 650).",
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
        titlu: "1. Who we are and about this document",
        paragrafe: [
          "The alexandrit.ro website and the Alexandrit platform (the “Platform”) are operated by MEDIGROUPPLUS SRL (the “Operator”, “we”), a company established on August 17, 2017, Tax ID (CUI) 38103518, Trade Registry number J07/617/2017. Registered office: [TO COMPLETE — registered address].",
          "These Terms describe how the Platform may be used by non-governmental organizations and other legal or natural persons who create an account (the “Customer” or “Organization”) and by their users, what we provide and what we ask in return. By creating an account or using the Platform you confirm that you have read and accept them. If you do not agree, you may not use the Platform.",
          "Key points: (1) the Platform is a CRM and a set of fundraising tools offered by subscription; (2) the data entered by the Organization remains the Organization's, and we process it as a data processor; (3) online donations go directly to the beneficiary Organization and do not pass through our accounts; (4) integrations and custom development are not included in the subscription and are carried out on request.",
        ],
      },
      {
        titlu: "2. Services",
        paragrafe: ["Depending on the plan chosen, the Platform provides the Customer with:"],
        puncte: [
          "a CRM for individuals (donors) and companies (sponsors), with donation and interaction history;",
          "tools for Form 230 (redirecting 3.5% of income tax), sponsorship contracts (20% and D177 formats) and reports;",
          "fundraising and online donation pages for the Organization's causes;",
          "team work schedule, tasks, newsletter, material generators and other tools shown in the Platform;",
          "1-on-1 consulting, training and fundraising educational materials;",
          "integrations with third-party services and implementation services, carried out on request (see section 9).",
        ],
        incheiere: ["Available features and plan limits (users, contacts, companies) are those shown on the Fundraising Hub page at sign-up. We may add, change or withdraw features in line with section 11."],
      },
      {
        titlu: "3. Account, users and roles",
        paragrafe: [
          "An account with a valid email address is required. The person creating the organization's account declares they may bind the Organization and becomes the “owner”. The Organization may invite other users with different roles (owner, administrator, member), within the users included in the plan.",
          "The Customer is responsible for keeping login details confidential, for activity under its users' accounts and for removing access of people who no longer work with the Organization. Tell us at the contact details in section 17 if you suspect unauthorized access.",
          "Data entered must be accurate and current. Each organization sees only its own data; one organization's data is not accessible to others.",
        ],
      },
      {
        titlu: "4. Subscriptions, prices and invoicing",
        paragrafe: [
          "Subscriptions (START, CREȘTERE, IMPACT) are paid monthly or annually at the prices in lei shown on the Fundraising Hub page when ordering; annual payment carries the displayed discount (“2 months free”). The free trial is 14 days, no bank card required. After the trial, access continues only after choosing and paying for a plan.",
          "Payment is made online through the payment processor integrated in the Platform. The tax invoice is issued electronically on the billing details you provide (name, tax ID, address) and sent to your email; invoicing is done through the Oblio invoicing service. Prices may include VAT where applicable by law.",
          "The subscription renews automatically for the same period until cancelled. You may cancel at any time; cancellation takes effect at the end of the period already paid, and amounts paid for the current period are not refunded, except where required by law or in case of an error attributable to us. If a payment cannot be processed we may suspend access until settled.",
          "Exceeding plan limits (users, contacts, companies) can be resolved by moving to a higher plan or through the additional options shown. We may change prices for future periods with at least 30 days' notice.",
        ],
      },
      {
        titlu: "5. Online donations and payments to Organizations",
        paragrafe: [
          "The Platform lets the Organization create fundraising pages and receive online donations. Donations are made by card through the Organization's own payment processor or the one integrated in the Platform (for example Stripe), on the processor's secure page; we do not see or store card data.",
          "The beneficiary of a donation is the Organization. We do not receive, hold or redistribute donated money and cannot issue refunds. Any issue with a donation (confirmation, refund, error) is resolved between the donor and the Organization, and the payment processor's terms apply to the relationship between the processor, the Organization and the donor.",
          "The Organization is solely responsible for the information published on its pages, for how it uses the funds received, for documents issued to donors and for compliance with the law applicable to its activity.",
        ],
      },
      {
        titlu: "6. The Organization's responsibilities regarding personal data",
        paragrafe: [
          "For the personal data of donors, volunteers, beneficiaries, employees and contacts entered into the Platform, the Organization is the data controller and Medigroupplus SRL acts as data processor, under the Privacy Policy (GDPR) and the applicable data processing agreement.",
          "The Organization must have the necessary legal basis for the data it enters or imports (for example consent, contract or legitimate interest), inform its data subjects, follow the rules on commercial communications (including unsubscribing) and not enter data it has no right to process. For special categories, in particular medical data and data about minors, the Organization is responsible for obtaining explicit consent and the legal representative's agreement.",
        ],
      },
      {
        titlu: "7. Acceptable use",
        paragrafe: ["You must not use the Platform for:"],
        puncte: [
          "illegal activities, fraud, or fundraising for false or misleading purposes;",
          "sending unsolicited messages (spam) or processing personal data without a legal basis;",
          "attempts to access other organizations' accounts or data, bypass security measures or overload systems;",
          "copying, reselling or redistributing the Platform or its materials without our consent.",
        ],
        incheiere: ["We may suspend or close an account that breaches these terms, without prior notice where the risk requires it, and will communicate the reasons as soon as possible."],
      },
      {
        titlu: "8. Customer data, export and deletion",
        paragrafe: [
          "Data entered by the Customer remains the Customer's property. You grant us only the right to store and process it to provide the services. You can export your data (CSV/Excel) while the account is active.",
          "When the contract ends, the Customer's data is deleted or anonymized within a reasonable time, after the Customer has had the opportunity to export it, except for data we must keep by law (for example accounting and tax records).",
        ],
      },
      {
        titlu: "9. Integrations and on-request services",
        paragrafe: [
          "Integrations with third-party services (for example email marketing, automation, payment processors, invoicing, e-signature, website) and custom development are not included in the subscription price. They are carried out only on request, under a separate quote describing what is delivered, when and at what price.",
          "Third-party services are governed by those providers' terms and prices, which the Customer must accept separately. We are not responsible for the operation, availability or changes of third-party services.",
        ],
      },
      {
        titlu: "10. Intellectual property",
        paragrafe: [
          "The Platform, its code, design, texts, templates, guides and other materials are protected by Law no. 8/1996 on copyright and related rights and remain the property of Medigroupplus SRL or its licensors. The Customer receives a personal, non-exclusive, non-transferable right of use for the duration of the active subscription.",
          "The Organization's name, logo and other distinctive signs remain its own; you allow us to display them in the Platform and on the pages you create, to provide the service.",
        ],
      },
      {
        titlu: "11. Availability and changes to the Platform",
        paragrafe: ["We work continuously to keep the Platform running without interruption but do not guarantee uninterrupted availability. We may perform maintenance and may change, suspend or withdraw features when we consider it necessary, with reasonable notice where possible. New features are subject to the same terms unless stated otherwise."],
      },
      {
        titlu: "12. Limitation of liability",
        paragrafe: [
          "The Platform is a tool; we do not guarantee any volume of donations, sponsorships or other fundraising results. We are not liable for how Organizations use the funds raised, for the content they publish, or for decisions taken based on data in the Platform.",
          "To the extent permitted by law, our total liability to the Customer for any claim related to the Platform does not exceed the subscription fees paid in the last 12 months and does not include indirect damages or lost profits. Nothing in this document limits liability that cannot be limited by law.",
        ],
      },
      {
        titlu: "13. Suspension and termination",
        paragrafe: ["You may stop using the Platform at any time by cancelling the subscription and, on request, deleting the account. We may suspend or close an account for breach of these terms, non-payment or a request from a competent authority. Provisions which by their nature must survive termination (intellectual property, liability, governing law) continue to apply."],
      },
      {
        titlu: "14. Links to other sites",
        paragrafe: ["The Platform and pages created through it may contain links to Organizations' or third parties' sites. Including a link does not mean we endorse the content or opinions on that site."],
      },
      {
        titlu: "15. Data protection and cookies",
        paragrafe: ["How we process personal data is described in the Privacy Policy (GDPR), and cookies in the Cookie Policy. Both form part of these terms."],
      },
      {
        titlu: "16. Governing law and disputes",
        paragrafe: ["These terms are governed by Romanian law. Any dispute is first resolved amicably; if that is not possible, it is settled by the competent courts of Romania."],
      },
      {
        titlu: "17. Changes to the terms and contact",
        paragrafe: [
          "We may update these terms, for example for legal or service changes. The version in force is the one published here with the last-updated date; for important changes we notify you by email or in the Platform. Continued use after publication means acceptance of the new version.",
          "For any question or complaint about the Platform: MEDIGROUPPLUS SRL, Tax ID 38103518, J07/617/2017 — email vlad.placinta@alexandrit.ro, phone 0757 401 042 (technical support: andrei.placinta@alexandrit.ro, 0721 425 650).",
        ],
      },
    ] satisfies SectiuneLegala[],
  },
} satisfies Record<Locale, unknown>;
