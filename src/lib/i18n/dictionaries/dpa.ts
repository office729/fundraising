import type { Locale } from "../config";
import type { SectiuneLegala } from "./termeni";

// Acord de prelucrare a datelor (DPA, art. 28 GDPR) între organizația-client (operator) și MEDIGROUPPLUS SRL (persoană
// împuternicită). Acceptat electronic de owner/admin al organizației (vezi organizations.dpa_*). Proiect de lucru:
// trebuie verificat de un jurist / DPO înainte de a fi considerat definitiv. La orice modificare de fond, schimbă
// DPA_VERSIUNE din lib/legal-version.ts (organizațiile sunt rugate să accepte din nou).
export const DPA_DICT = {
  ro: {
    homeLabel: "Acasă",
    eyebrow: "Legal",
    titlu: "Acord de prelucrare a datelor (DPA)",
    actualizatLabel: "Versiune",
    actualizat: "5 octombrie 2026",
    sectiuni: [
      {
        titlu: "1. Părțile și obiectul acordului",
        paragrafe: [
          "Acest acord („Acordul”) se încheie între organizația care folosește platforma Alexandrit („Operatorul”) și MEDIGROUPPLUS SRL (CUI 38103518, J07/617/2017, Str. Prieteniei nr. 4, sat Boscoteni, comuna Frumușica, județul Botoșani) („Persoana împuternicită”), în baza art. 28 din Regulamentul (UE) 2016/679 („GDPR”). Face parte din Termenii și condițiile Platformei și se aplică pe toată durata în care Operatorul are un cont.",
          "Operatorul decide scopurile și mijloacele prelucrării datelor personale pe care le introduce în Platformă. Persoana împuternicită prelucrează aceste date doar în numele și conform instrucțiunilor documentate ale Operatorului, ca furnizor al infrastructurii tehnice a Platformei.",
        ],
      },
      {
        titlu: "2. Descrierea prelucrării",
        puncte: [
          "Natura și scopul: găzduirea și operarea aplicației în care Operatorul își gestionează CRM-ul (persoane de contact, donatori, sponsori, voluntari, beneficiari), paginile de campanie și donații, Formularul 230, comunicările (email, apeluri) pornite de Operator și rapoartele sale;",
          "Durata: cât timp contul Operatorului este activ, plus perioada de retenție de la secțiunea 10;",
          "Tipuri de date: date de identificare și contact (nume, email, telefon, adresă), istoricul donațiilor și al comunicărilor, date din Formularul 230 (inclusiv CNP și semnătură), notițe, precum și, dacă Operatorul le introduce, date despre sănătate sau despre minori (categorii speciale — vezi secțiunea 11);",
          "Categorii de persoane vizate: donatori, sponsori și persoane de contact ale companiilor, voluntari, beneficiari și reprezentanții lor legali, angajați și colaboratori ai Operatorului, creatori de pagini de campanie.",
        ],
      },
      {
        titlu: "3. Instrucțiunile Operatorului",
        paragrafe: [
          "Persoana împuternicită prelucrează datele doar pe baza instrucțiunilor documentate ale Operatorului: acest Acord, Termenii și condițiile și utilizarea funcțiilor Platformei de către utilizatorii Operatorului. Dacă o instrucțiune încalcă, în opinia noastră, GDPR sau alte norme de protecție a datelor, îl informăm imediat pe Operator.",
          "Persoana împuternicită nu folosește datele Operatorului pentru scopuri proprii, de marketing sau de altă natură și nu le combină cu datele altor organizații.",
        ],
      },
      {
        titlu: "4. Confidențialitate",
        paragrafe: [
          "Persoanele din echipa Persoanei împuternicite care pot accesa datele Operatorului (doar pentru suport tehnic, la cererea acestuia, sau când legea o impune) sunt ținute la confidențialitate printr-un angajament contractual sau legal.",
        ],
      },
      {
        titlu: "5. Măsuri de securitate",
        paragrafe: ["Persoana împuternicită aplică măsuri tehnice și organizatorice adecvate riscului (art. 32 GDPR), între care:"],
        puncte: [
          "izolarea strictă a datelor între organizații, la nivel de bază de date (politici de securitate pe rând), și control al accesului pe roluri (owner, admin, membru);",
          "criptarea conexiunilor (HTTPS) și criptarea câmpurilor sensibile stocate (de exemplu CNP-ul din Formularul 230, cheile de plată ale organizațiilor);",
          "autentificare cu confirmarea adresei de email, limitarea încercărilor repetate și jurnale de securitate și de audit pentru acțiuni sensibile;",
          "copii de siguranță ale bazei de date și acces limitat al echipei noastre la datele clienților;",
          "separarea mediilor și gestionarea secretelor în afara codului sursă.",
        ],
      },
      {
        titlu: "6. Sub-procesatori",
        paragrafe: [
          "Operatorul autorizează în mod general folosirea sub-procesatorilor de mai jos. Persoana împuternicită încheie cu fiecare un contract care impune obligații echivalente de protecție a datelor și răspunde față de Operator pentru ei.",
        ],
        puncte: [
          "Vercel — găzduirea aplicației;",
          "Supabase — baza de date și autentificarea (regiune UE);",
          "furnizorul de web hosting al platformei (romania-webhosting.com) — serviciul de email al domeniului alexandrit.ro, pentru emailurile trimise la cererea Operatorului;",
          "Anthropic (Claude) — generare de conținut asistată de AI, doar când Operatorul folosește funcția respectivă;",
          "Twilio — apeluri și mesaje, unde funcția este activată de Operator;",
          "Calendly — programarea consilierilor;",
          "Sentry — monitorizarea erorilor tehnice ale Platformei (fără datele din formulare sau din CRM; adresele paginilor sunt curățate de parametri și tokenuri);",
          "servicii de integrare activate la cererea Operatorului (de exemplu Make.com, Canva, Newsman, Brevo, Mailchimp, BoldSign) — doar pentru Operatorul care le solicită.",
        ],
        incheiere: [
          "Plățile de donații se fac direct în contul Stripe al Operatorului, iar plata abonamentului Platformei se face prin Netopia Payments; în aceste cazuri furnizorii de plată acționează în nume propriu sau al Operatorului, nu ca sub-procesatori ai datelor din CRM.",
          "Orice adăugare sau înlocuire de sub-procesator se comunică Operatorului (prin email sau în Platformă) cu cel puțin 14 zile înainte, iar Operatorul se poate opune motivat în acest termen; dacă nu ajungem la o soluție, Operatorul poate înceta contractul.",
        ],
      },
      {
        titlu: "7. Transferuri în afara Spațiului Economic European",
        paragrafe: [
          "Unii sub-procesatori pot prelucra date și în afara SEE, în special în SUA. Transferurile se bazează pe decizia de adecvare privind Cadrul UE–SUA de confidențialitate a datelor pentru furnizorii certificați sau pe clauzele contractuale standard, împreună cu măsuri suplimentare atunci când este necesar. Baza de date a Platformei este găzduită în UE.",
        ],
      },
      {
        titlu: "8. Asistență pentru drepturile persoanelor vizate",
        paragrafe: [
          "Operatorul răspunde cererilor persoanelor vizate. Persoana împuternicită îl asistă prin mijloace tehnice și organizatorice adecvate: Platforma oferă export al datelor, căutare după adresa de email și ștergere/anonimizare (Setări → Cereri GDPR și panoul GDPR din profilul donatorului), precum și dezabonare de la emailurile de campanie. Dacă primim direct o cerere a unei persoane vizate privind datele Operatorului, i-o transmitem fără întârziere.",
        ],
      },
      {
        titlu: "9. Încălcări ale securității datelor",
        paragrafe: [
          "Persoana împuternicită notifică Operatorul fără întârzieri nejustificate, de regulă în cel mult 48 de ore de la luarea la cunoștință, despre orice încălcare a securității care afectează datele Operatorului, cu informațiile disponibile (natura incidentului, datele și persoanele afectate, măsurile luate), pentru ca Operatorul să își poată îndeplini obligațiile de notificare către autoritate și persoanele vizate.",
        ],
      },
      {
        titlu: "10. Încetarea contractului: returnare și ștergere",
        paragrafe: [
          "Operatorul își poate exporta datele oricând, inclusiv după expirarea accesului (owner). Dacă accesul expiră și contul nu este reactivat, ștergem definitiv datele Operatorului la 90 de zile de la expirare, după două avertizări prin email (la 60 și la 83 de zile). Operatorul poate cere ștergerea mai devreme, din Setări sau în scris. Copiile de siguranță se șterg la expirarea ciclului lor normal.",
          "Fac excepție datele pe care legea ne obligă să le păstrăm (de exemplu documentele fiscale emise de noi pentru abonament, 10 ani).",
        ],
      },
      {
        titlu: "11. Date sensibile: cazuri medicale și minori",
        paragrafe: [
          "Dacă Operatorul introduce date privind sănătatea sau minori, el răspunde de existența temeiului legal și a consimțământului explicit al persoanei sau al reprezentantului legal și de evaluarea necesității unei evaluări de impact (DPIA). Persoana împuternicită aplică aceleași măsuri de securitate, dar recomandă Operatorului să introducă doar datele strict necesare.",
        ],
      },
      {
        titlu: "12. Audit",
        paragrafe: [
          "Persoana împuternicită pune la dispoziția Operatorului informațiile necesare pentru a demonstra respectarea acestui Acord și permite verificări rezonabile (inclusiv audituri), cu un preaviz rezonabil, într-un cadru care nu afectează confidențialitatea altor clienți și funcționarea Platformei.",
        ],
      },
      {
        titlu: "13. Răspundere, legea aplicabilă și acceptare",
        paragrafe: [
          "Răspunderea părților este cea prevăzută de GDPR și de Termenii și condițiile Platformei. În caz de conflict între acest Acord și Termeni în privința prelucrării datelor personale, prevalează acest Acord. Legea aplicabilă și instanțele competente sunt cele prevăzute în Termeni.",
          "Acordul se încheie electronic: acceptarea de către un owner sau administrator al organizației (la crearea contului sau din Setări) se înregistrează cu data, versiunea acceptată și utilizatorul, și are valoare de semnătură electronică simplă pentru Operator. O nouă versiune de fond se comunică Operatorului și se acceptă din nou.",
        ],
      },
    ] satisfies SectiuneLegala[],
  },
  en: {
    homeLabel: "Home",
    eyebrow: "Legal",
    titlu: "Data Processing Agreement (DPA)",
    actualizatLabel: "Version",
    actualizat: "October 5, 2026",
    sectiuni: [
      {
        titlu: "1. Parties and subject matter",
        paragrafe: [
          "This agreement (the “Agreement”) is made between the organization using the Alexandrit platform (the “Controller”) and MEDIGROUPPLUS SRL (tax ID 38103518, J07/617/2017, 4 Prieteniei St., Boscoteni village, Frumușica commune, Botoșani county, Romania) (the “Processor”), under Art. 28 of Regulation (EU) 2016/679 (“GDPR”). It forms part of the Platform's Terms and Conditions and applies for as long as the Controller has an account.",
          "The Controller determines the purposes and means of processing the personal data it enters into the Platform. The Processor processes this data only on behalf of and per the Controller's documented instructions, as the provider of the Platform's technical infrastructure.",
        ],
      },
      {
        titlu: "2. Description of the processing",
        puncte: [
          "Nature and purpose: hosting and operating the application in which the Controller manages its CRM (contacts, donors, sponsors, volunteers, beneficiaries), campaign and donation pages, Form 230, communications (email, calls) initiated by the Controller, and its reports;",
          "Duration: while the Controller's account is active, plus the retention period in section 10;",
          "Types of data: identification and contact data (name, email, phone, address), donation and communication history, Form 230 data (including personal ID number and signature), notes, and, if the Controller enters them, health data or data about minors (special categories — see section 11);",
          "Data subjects: donors, sponsors and company contact persons, volunteers, beneficiaries and their legal representatives, the Controller's employees and collaborators, campaign page creators.",
        ],
      },
      {
        titlu: "3. The Controller's instructions",
        paragrafe: [
          "The Processor processes data only on the Controller's documented instructions: this Agreement, the Terms and Conditions, and the use of the Platform's features by the Controller's users. If, in our opinion, an instruction infringes the GDPR or other data protection rules, we will inform the Controller immediately.",
          "The Processor does not use the Controller's data for its own purposes, for marketing or otherwise, and does not combine it with other organizations' data.",
        ],
      },
      {
        titlu: "4. Confidentiality",
        paragrafe: [
          "People on the Processor's team who may access the Controller's data (only for technical support, at the Controller's request, or when required by law) are bound by a contractual or statutory confidentiality obligation.",
        ],
      },
      {
        titlu: "5. Security measures",
        paragrafe: ["The Processor applies technical and organizational measures appropriate to the risk (Art. 32 GDPR), including:"],
        puncte: [
          "strict isolation of data between organizations at database level (row-level security policies) and role-based access control (owner, admin, member);",
          "encrypted connections (HTTPS) and encryption of stored sensitive fields (for example the personal ID number in Form 230 and organizations' payment keys);",
          "authentication with email confirmation, rate limiting of repeated attempts, and security and audit logs for sensitive actions;",
          "database backups and limited access by our team to customer data;",
          "separation of environments and management of secrets outside the source code.",
        ],
      },
      {
        titlu: "6. Sub-processors",
        paragrafe: [
          "The Controller gives general authorization to use the sub-processors below. The Processor concludes a contract with each one imposing equivalent data protection obligations and remains liable to the Controller for them.",
        ],
        puncte: [
          "Vercel — application hosting;",
          "Supabase — database and authentication (EU region);",
          "the platform's web hosting provider (romania-webhosting.com) — the alexandrit.ro domain's email service, for emails sent at the Controller's request;",
          "Anthropic (Claude) — AI-assisted content generation, only when the Controller uses that feature;",
          "Twilio — calls and messages, where the Controller enables the feature;",
          "Calendly — scheduling of advisors;",
          "Sentry — monitoring of the Platform's technical errors (without form or CRM data; page addresses are stripped of parameters and tokens);",
          "integration services enabled at the Controller's request (for example Make.com, Canva, Newsman, Brevo, Mailchimp, BoldSign) — only for the Controller that requests them.",
        ],
        incheiere: [
          "Donation payments go directly into the Controller's own Stripe account, and the Platform subscription is paid through Netopia Payments; in those cases the payment providers act on their own behalf or on the Controller's, not as sub-processors of CRM data.",
          "Any addition or replacement of a sub-processor is communicated to the Controller (by email or in the Platform) at least 14 days in advance, and the Controller may object on reasonable grounds within that period; if no solution is found, the Controller may terminate the contract.",
        ],
      },
      {
        titlu: "7. Transfers outside the European Economic Area",
        paragrafe: [
          "Some sub-processors may also process data outside the EEA, in particular in the USA. Transfers rely on the adequacy decision on the EU–US Data Privacy Framework for certified providers or on standard contractual clauses, together with supplementary measures where necessary. The Platform's database is hosted in the EU.",
        ],
      },
      {
        titlu: "8. Assistance with data subject rights",
        paragrafe: [
          "The Controller answers data subjects' requests. The Processor assists it through appropriate technical and organizational means: the Platform offers data export, search by email address and deletion/anonymization (Settings → GDPR requests and the GDPR panel on a donor's profile), as well as unsubscribing from campaign emails. If we receive a data subject's request about the Controller's data directly, we forward it without delay.",
        ],
      },
      {
        titlu: "9. Personal data breaches",
        paragrafe: [
          "The Processor notifies the Controller without undue delay, as a rule within 48 hours of becoming aware, of any security breach affecting the Controller's data, with the information available (nature of the incident, data and people affected, measures taken), so that the Controller can meet its notification obligations to the authority and data subjects.",
        ],
      },
      {
        titlu: "10. Termination: return and deletion",
        paragrafe: [
          "The Controller can export its data at any time, including after access has expired (owner). If access expires and the account is not reactivated, we permanently delete the Controller's data 90 days after expiry, after two email warnings (at 60 and 83 days). The Controller may request earlier deletion, from Settings or in writing. Backups are deleted when their normal cycle ends.",
          "Data we are legally required to keep (for example tax documents we issue for the subscription, 10 years) is excepted.",
        ],
      },
      {
        titlu: "11. Sensitive data: medical cases and minors",
        paragrafe: [
          "If the Controller enters health data or data about minors, it is responsible for having a legal basis and the explicit consent of the person or legal representative, and for assessing whether a data protection impact assessment (DPIA) is needed. The Processor applies the same security measures but recommends entering only strictly necessary data.",
        ],
      },
      {
        titlu: "12. Audit",
        paragrafe: [
          "The Processor makes available to the Controller the information necessary to demonstrate compliance with this Agreement and allows reasonable verifications (including audits), with reasonable notice, in a manner that does not affect the confidentiality of other customers or the operation of the Platform.",
        ],
      },
      {
        titlu: "13. Liability, governing law and acceptance",
        paragrafe: [
          "The parties' liability is as provided by the GDPR and the Platform's Terms and Conditions. In case of conflict between this Agreement and the Terms regarding the processing of personal data, this Agreement prevails. The governing law and competent courts are those set out in the Terms.",
          "The Agreement is concluded electronically: acceptance by an owner or administrator of the organization (when creating the account or from Settings) is recorded with the date, the accepted version and the user, and has the value of a simple electronic signature for the Controller. A new substantive version is communicated to the Controller and accepted again.",
        ],
      },
    ] satisfies SectiuneLegala[],
  },
} satisfies Record<Locale, unknown>;
