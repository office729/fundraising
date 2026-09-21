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
    actualizat: "21 septembrie 2026",
    sectiuni: [
      {
        titlu: "1. Cine suntem și în ce calitate prelucrăm date",
        paragrafe: [
          "MEDIGROUPPLUS SRL (CUI 38103518, J07/617/2017, înființată la 17 august 2017; sediul social: [DE COMPLETAT — adresa sediului social]) operează platforma Alexandrit („Platforma”) și site-ul alexandrit.ro.",
          "Avem două calități diferite: (a) operator de date pentru datele proprii ale vizitatorilor site-ului, ale clienților noștri și ale utilizatorilor Platformei (cont, abonament, facturare, comunicare, consiliere); (b) persoană împuternicită pentru datele pe care organizațiile client (ONG-uri) le introduc în CRM-ul lor — donatori, sponsori, voluntari, beneficiari, angajați. Pentru acestea din urmă, operatorul este organizația client (vezi punctul 9).",
          "Contact pentru orice aspect legat de datele personale: vlad.placinta@alexandrit.ro, telefon 0757 401 042.",
        ],
      },
      {
        titlu: "2. Ce date prelucrăm în calitate de operator",
        paragrafe: ["Pe site și în Platformă, pentru propriile noastre scopuri, putem prelucra:"],
        puncte: [
          "date de cont: nume, email, rolul în organizație, parola (stocată criptat, prin furnizorul de autentificare);",
          "date de facturare și de plată ale clienților: denumire, CUI, adresă, istoricul facturilor și al abonamentelor (datele cardului sunt prelucrate exclusiv de procesatorul de plăți și nu ajung la noi);",
          "date de contact transmise prin formulare, email, telefon sau la programarea unei consilieri (nume, telefon, mesaj, intervalul ales);",
          "date tehnice minime: adresă IP, tip de browser, jurnale de securitate și erori, cookie-uri de sesiune; cookie-uri de analiză doar cu consimțământul tău (vezi Politica de cookies).",
        ],
      },
      {
        titlu: "3. Scopurile și temeiurile legale",
        paragrafe: ["Prelucrăm datele pentru următoarele scopuri, pe temeiurile de mai jos:"],
        puncte: [
          "furnizarea Platformei, a contului, a abonamentului și a suportului — executarea contractului (art. 6(1)(b) GDPR);",
          "facturare, contabilitate și obligații fiscale — obligație legală (art. 6(1)(c));",
          "securitatea Platformei, prevenirea abuzurilor și îmbunătățirea serviciului — interes legitim (art. 6(1)(f));",
          "comunicări comerciale opționale și cookie-uri de analiză — consimțământ (art. 6(1)(a)), pe care îl poți retrage oricând;",
          "răspunsul la solicitări și programarea consilierilor — măsuri precontractuale la cererea ta sau interes legitim.",
        ],
      },
      {
        titlu: "4. Cui transmitem datele (sub-procesatori și furnizori)",
        paragrafe: ["Folosim furnizori tehnici care prelucrează date în numele nostru sau pentru serviciile pe care le folosești, pe baza unor contracte de prelucrare:"],
        puncte: [
          "Vercel — găzduirea aplicației și a site-ului;",
          "Supabase — baza de date și autentificarea (regiune UE);",
          "Stripe și/sau alți procesatori de plăți integrați (de exemplu EuPlătesc) — plata abonamentelor și a donațiilor;",
          "Oblio — emiterea și trimiterea facturilor fiscale;",
          "Resend sau alt serviciu de email tranzacțional — emailuri de cont, mulțumire și reamintire;",
          "Twilio — apeluri și mesaje, unde funcția este activată;",
          "Calendly — programarea consilierilor 1 la 1;",
          "Google Analytics — statistici de utilizare, doar cu consimțământul tău;",
          "servicii de integrare activate la cerere de client (de exemplu Make.com, BoldSign, Newsman, Brevo, Mailchimp, Canva) — doar pentru clientul care le solicită.",
        ],
        incheiere: ["Nu vindem date personale. Le putem transmite autorităților doar când legea ne obligă. Lista actualizată a sub-procesatorilor ne poate fi cerută oricând la datele de contact de mai sus."],
      },
      {
        titlu: "5. Transferuri în afara Spațiului Economic European",
        paragrafe: ["Unii furnizori (de exemplu Stripe, Google, Twilio, Vercel, Calendly) pot prelucra date și în afara SEE, în special în SUA. În aceste cazuri ne bazăm pe garanții prevăzute de GDPR: decizia de adecvare privind Cadrul UE–SUA de confidențialitate a datelor pentru furnizorii certificați sau clauzele contractuale standard, împreună cu măsuri suplimentare atunci când este necesar. Datele din baza de date a Platformei sunt găzduite în UE."],
      },
      {
        titlu: "6. Cât timp păstrăm datele",
        puncte: [
          "date de cont și de organizație: pe durata contractului, iar după încetare le ștergem sau le anonimizăm într-un termen rezonabil, după ce clientul le-a putut exporta;",
          "documente fiscale și contabile (facturi, contracte): conform legislației contabile din România, de regulă 10 ani;",
          "jurnale tehnice și de securitate: pe perioade scurte, strict necesare;",
          "date de contact din solicitări: cât timp este necesar pentru a răspunde și, după aceea, cel mult perioada în care pot apărea pretenții legate de solicitare;",
          "datele introduse în CRM de către organizațiile client: conform instrucțiunilor și politicilor de retenție ale organizației (operatorul acestor date).",
        ],
      },
      {
        titlu: "7. Drepturile tale",
        paragrafe: [
          "Conform GDPR ai dreptul de acces, rectificare, ștergere, restricționare a prelucrării, portabilitate, opoziție și dreptul de a nu face obiectul unei decizii bazate exclusiv pe prelucrare automată. Îți poți retrage oricând consimțământul, fără a afecta legalitatea prelucrării de până atunci.",
          "Pentru a-ți exercita drepturile, scrie-ne la vlad.placinta@alexandrit.ro; îți răspundem în cel mult o lună. Dacă datele tale se află în CRM-ul unei organizații (de exemplu ești donator), cererea trebuie adresată acelei organizații; noi o vom ajuta să răspundă.",
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
        titlu: "9. Datele din CRM-ul organizațiilor client (persoană împuternicită)",
        paragrafe: [
          "Organizația care folosește Platforma este operator pentru datele persoanelor din CRM-ul său (donatori, sponsori, voluntari, beneficiari, angajați, contacte) și decide scopurile și temeiul prelucrării, informarea persoanelor și retenția. Noi acționăm ca persoană împuternicită și prelucrăm aceste date doar pentru a furniza serviciul și conform instrucțiunilor documentate ale organizației.",
          "Prin acordul de prelucrare încheiat cu fiecare organizație ne angajăm, printre altele, să: păstrăm confidențialitatea; aplicăm măsuri de securitate adecvate; folosim sub-procesatori doar cu informarea organizației; asistăm organizația în exercitarea drepturilor persoanelor vizate; o notificăm fără întârzieri nejustificate despre incidente; și, la încetarea contractului, ștergem sau returnăm datele, în afara celor pe care legea ne obligă să le păstrăm.",
          "Organizația se asigură că are temei legal pentru datele introduse (consimțământ, contract, interes legitim), că își informează persoanele vizate și respectă regulile privind comunicările comerciale, inclusiv dezabonarea.",
        ],
      },
      {
        titlu: "10. Date sensibile: cazuri medicale și minori",
        paragrafe: [
          "Unele organizații pot introduce în Platformă date despre sănătate sau despre minori (de exemplu în campanii pentru cazuri medicale). Acestea sunt categorii speciale de date (art. 9 GDPR) sau date care necesită protecție sporită. Organizația răspunde de obținerea consimțământului explicit al persoanei sau al reprezentantului legal, separat pentru date medicale, imagine și poveste, de limitarea datelor la ce este strict necesar și de respectarea dreptului de retragere a consimțământului.",
          "Recomandăm organizațiilor să nu introducă în câmpuri libere mai multe detalii medicale decât este necesar și să analizeze, împreună cu un specialist, necesitatea unei evaluări de impact asupra protecției datelor (DPIA) pentru aceste prelucrări.",
        ],
      },
      {
        titlu: "11. Cookie-uri",
        paragrafe: ["Folosim cookie-uri strict necesare funcționării (de exemplu sesiunea de autentificare) și, doar cu acordul tău, cookie-uri de analiză. Detalii și opțiuni de gestionare găsești în Politica de cookies."],
      },
      {
        titlu: "12. Modificări ale acestei politici",
        paragrafe: ["Putem actualiza această politică; versiunea în vigoare este cea publicată aici, cu data ultimei actualizări. Pentru modificări importante te anunțăm prin email sau în Platformă."],
      },
    ] satisfies SectiuneLegala[],
  },
  en: {
    homeLabel: "Home",
    eyebrow: "Legal",
    titlu: "Privacy Policy (GDPR)",
    actualizatLabel: "Last updated",
    actualizat: "September 21, 2026",
    sectiuni: [
      {
        titlu: "1. Who we are and in what capacity we process data",
        paragrafe: [
          "MEDIGROUPPLUS SRL (Tax ID 38103518, J07/617/2017, established August 17, 2017; registered office: [TO COMPLETE — registered address]) operates the Alexandrit platform (the “Platform”) and the alexandrit.ro website.",
          "We act in two capacities: (a) as data controller for our own data about website visitors, our customers and Platform users (account, subscription, invoicing, communication, consulting); (b) as data processor for the data that customer organizations (NGOs) enter into their CRM — donors, sponsors, volunteers, beneficiaries, employees. For the latter, the controller is the customer organization (see section 9).",
          "Contact for anything concerning personal data: vlad.placinta@alexandrit.ro, phone 0757 401 042.",
        ],
      },
      {
        titlu: "2. What data we process as controller",
        paragrafe: ["On the website and in the Platform, for our own purposes, we may process:"],
        puncte: [
          "account data: name, email, role in the organization, password (stored encrypted through the authentication provider);",
          "customers' billing and payment data: name, tax ID, address, invoice and subscription history (card data is processed exclusively by the payment processor and never reaches us);",
          "contact data sent via forms, email, phone or when booking a consultation (name, phone, message, chosen slot);",
          "minimal technical data: IP address, browser type, security and error logs, session cookies; analytics cookies only with your consent (see the Cookie Policy).",
        ],
      },
      {
        titlu: "3. Purposes and legal bases",
        paragrafe: ["We process data for the following purposes, on the following bases:"],
        puncte: [
          "providing the Platform, account, subscription and support — performance of a contract (Art. 6(1)(b) GDPR);",
          "invoicing, accounting and tax obligations — legal obligation (Art. 6(1)(c));",
          "Platform security, abuse prevention and service improvement — legitimate interest (Art. 6(1)(f));",
          "optional marketing communications and analytics cookies — consent (Art. 6(1)(a)), which you can withdraw at any time;",
          "answering requests and booking consultations — pre-contractual steps at your request or legitimate interest.",
        ],
      },
      {
        titlu: "4. Who we share data with (sub-processors and providers)",
        paragrafe: ["We use technical providers that process data on our behalf or for the services you use, under data processing contracts:"],
        puncte: [
          "Vercel — application and website hosting;",
          "Supabase — database and authentication (EU region);",
          "Stripe and/or other integrated payment processors (for example EuPlătesc) — subscription and donation payments;",
          "Oblio — issuing and sending tax invoices;",
          "Resend or another transactional email service — account, thank-you and reminder emails;",
          "Twilio — calls and messages, where the feature is enabled;",
          "Calendly — booking 1-on-1 consultations;",
          "Google Analytics — usage statistics, only with your consent;",
          "integration services enabled on a customer's request (for example Make.com, BoldSign, Newsman, Brevo, Mailchimp, Canva) — only for the customer who requests them.",
        ],
        incheiere: ["We do not sell personal data. We may disclose it to authorities only when required by law. The up-to-date list of sub-processors can be requested at any time at the contact details above."],
      },
      {
        titlu: "5. Transfers outside the European Economic Area",
        paragrafe: ["Some providers (for example Stripe, Google, Twilio, Vercel, Calendly) may also process data outside the EEA, in particular in the USA. In these cases we rely on GDPR safeguards: the adequacy decision on the EU–US Data Privacy Framework for certified providers or standard contractual clauses, together with supplementary measures where necessary. The Platform's database is hosted in the EU."],
      },
      {
        titlu: "6. How long we keep data",
        puncte: [
          "account and organization data: for the duration of the contract; afterwards we delete or anonymize it within a reasonable time, after the customer has been able to export it;",
          "tax and accounting documents (invoices, contracts): under Romanian accounting law, usually 10 years;",
          "technical and security logs: for short periods strictly necessary;",
          "contact data from requests: as long as needed to reply and thereafter no longer than claims related to the request could arise;",
          "data entered in the CRM by customer organizations: according to the organization's instructions and retention policies (the controller of that data).",
        ],
      },
      {
        titlu: "7. Your rights",
        paragrafe: [
          "Under the GDPR you have the right of access, rectification, erasure, restriction of processing, portability, objection, and the right not to be subject to a decision based solely on automated processing. You may withdraw consent at any time, without affecting the lawfulness of prior processing.",
          "To exercise your rights write to vlad.placinta@alexandrit.ro; we reply within one month. If your data is in an organization's CRM (for example you are a donor), the request must be addressed to that organization; we will help it respond.",
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
        titlu: "9. Data in customer organizations' CRM (data processor)",
        paragrafe: [
          "The organization using the Platform is the controller of the data of the people in its CRM (donors, sponsors, volunteers, beneficiaries, employees, contacts) and decides the purposes and legal basis of processing, notice to individuals and retention. We act as processor and process this data only to provide the service and on the organization's documented instructions.",
          "Under the data processing agreement concluded with each organization we undertake, among other things, to: keep it confidential; apply appropriate security measures; use sub-processors only with notice to the organization; assist the organization in handling data subjects' rights; notify it without undue delay of incidents; and, at the end of the contract, delete or return the data, except what the law requires us to keep.",
          "The organization ensures it has a legal basis for the data entered (consent, contract, legitimate interest), that it informs its data subjects and follows the rules on commercial communications, including unsubscribing.",
        ],
      },
      {
        titlu: "10. Sensitive data: medical cases and minors",
        paragrafe: [
          "Some organizations may enter health data or data about minors into the Platform (for example in campaigns for medical cases). These are special categories of data (Art. 9 GDPR) or data needing enhanced protection. The organization is responsible for obtaining the explicit consent of the person or legal representative, separately for medical data, image and story, for limiting the data to what is strictly necessary and for respecting the right to withdraw consent.",
          "We recommend that organizations do not enter more medical detail in free-text fields than necessary and assess, with a specialist, whether a data protection impact assessment (DPIA) is needed for such processing.",
        ],
      },
      {
        titlu: "11. Cookies",
        paragrafe: ["We use cookies strictly necessary for operation (for example the authentication session) and, only with your consent, analytics cookies. Details and options are in the Cookie Policy."],
      },
      {
        titlu: "12. Changes to this policy",
        paragrafe: ["We may update this policy; the version in force is the one published here with the last-updated date. For important changes we notify you by email or in the Platform."],
      },
    ] satisfies SectiuneLegala[],
  },
} satisfies Record<Locale, unknown>;
