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
    actualizat: "4 noiembrie 2026",
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
          "Natura și scopul: găzduirea și operarea aplicației în care Operatorul își gestionează CRM-ul (persoane de contact, donatori, sponsori, voluntari, beneficiari), paginile de campanie și donații, Formularul 230, comunicările (email, apeluri) pornite de Operator, inclusiv parcursurile automate de e-mail către donatori, pornite și editate de Operator (destinatarii se aleg după istoricul donațiilor și sunt doar donatorii care au acceptat mesajele), și rapoartele sale;",
          "Funcții publice ale paginilor de campanie, în scopurile și pe temeiurile stabilite de Operator: măsurarea vizitelor (amprentă zilnică pseudonimizată, sursă, dispozitiv, țară; fără cookie-uri și fără stocarea adresei IP; păstrare 13 luni) portalul donatorului lunar (e-mail cu link pentru gestionarea donației) și widgetul de donație încorporat pe site-ul Operatorului (la încărcarea formularului primim adresa IP, browserul și domeniul site-ului gazdă, folosite pentru servirea paginii, securitate și statistici agregate; fără cookie-uri; Operatorul își informează vizitatorii în propria politică de confidențialitate);",
          "Agentul email (prospectare B2B) și Influencerii, la inițiativa Operatorului: generarea asistată de AI a ciornelor de email către persoane de contact profesionale ale companiilor, aprobate și trimise de utilizatorul Operatorului; citirea răspunsurilor prin IMAP și salvarea de fragmente; un pixel de deschidere, doar dacă Operatorul îl activează; fișe de influenceri. Date: nume, funcție, email profesional, conținutul mesajelor, date tehnice de deschidere. Persoane vizate: persoane de contact din companii, influenceri;",
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
          "Persoana împuternicită nu transferă datele Operatorului în țări terțe decât la instrucțiunile Operatorului sau când legea o impune.",
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
          "criptarea cheilor API și a credențialelor conectate de Operator (Anthropic, furnizori de date, căsuțe de email), care nu se mai afișează după salvare;",
          "autentificare cu confirmarea adresei de email, limitarea încercărilor repetate și jurnale de securitate și de audit pentru acțiuni sensibile;",
          "copii de siguranță ale bazei de date și acces limitat al echipei noastre la datele clienților;",
          "separarea mediilor și gestionarea secretelor în afara codului sursă.",
        ],
      },
      {
        titlu: "6. Sub-procesatori",
        paragrafe: [
          "A. Sub-procesatori ai Persoanei împuternicite. Operatorul autorizează în mod general folosirea sub-procesatorilor de mai jos. Persoana împuternicită încheie cu fiecare un contract care impune obligații echivalente de protecție a datelor și răspunde față de Operator pentru ei.",
        ],
        puncte: [
          "Vercel — găzduirea aplicației;",
          "Supabase — baza de date și autentificarea (regiune UE);",
          "furnizorul de web hosting al platformei (romania-webhosting.com) — serviciul de email al domeniului alexandrit.ro, pentru emailurile trimise la cererea Operatorului;",
          "Twilio — apeluri și mesaje, unde funcția este activată de Operator;",
          "Calendly — programarea consilierilor;",
          "Sentry — monitorizarea erorilor tehnice ale Platformei (fără datele din formulare sau din CRM; adresele paginilor sunt curățate de parametri și tokenuri);",
          "servicii de integrare activate la cererea Operatorului (de exemplu Make.com, Canva, Newsman, Brevo, Mailchimp, BoldSign) — doar pentru Operatorul care le solicită.",
        ],
        incheiere: [
          "B. Servicii conectate de Operator cu conturile, cheile sau căsuțele proprii (Anthropic, Apollo, Lusha, Prospeo, Hunter, Waalaxy, serverele de email ale colegilor Operatorului). Operatorul alege furnizorul, încheie direct contractul și termenii acestuia (inclusiv acordul de prelucrare și mecanismul de transfer) și hotărăște ce date se transmit. Acești furnizori nu sunt sub-procesatori ai Persoanei împuternicite, iar aceasta nu răspunde pentru prelucrarea făcută de ei sub contul Operatorului. Rolul Persoanei împuternicite se limitează la: (i) stocarea criptată a cheilor și credențialelor; (ii) transmiterea, prin conexiune criptată, doar a datelor necesare funcției pornite de Operator sau de utilizatorul lui, ca instrucțiune documentată; (iii) neutilizarea datelor returnate în alte scopuri. După funcție, se pot trimite: titlul, sumele și linkul campaniei (povestea campaniei doar dacă Operatorul bifează în Setări și campania are acord pentru diagnostic); dosarul organizației și cerințele finanțatorului în Granturi (fără contacte și IBAN); în Agentul email, datele firmei din CRM, numele și funcția persoanei de contact și textul răspunsurilor primite (din care se scot emailurile, telefoanele, IBAN-urile și CNP-urile); la căutarea de decidenți pe internet, numele firmei, CUI-ul, localitatea, site-ul și administratorul; în analiza reclamelor, date agregate pe campanie; în Influenceri, numele public, categoria și orașul. Operatorul se obligă să nu transmită date de sănătate sau date ale beneficiarilor fără temei legal și fără anonimizare. Operatorul răspunde pentru contractul art. 28 cu fiecare furnizor (sau, dacă furnizorul acționează ca operator pentru propriile baze de date, pentru legalitatea obținerii acelor date), pentru temeiul legal, informarea persoanelor vizate (art. 13–14), transferurile efectuate prin aceste servicii și pentru conectarea doar a căsuțelor profesionale pe care are dreptul să le conecteze, cu știrea titularului.",
          "Plățile de donații se fac direct în contul Stripe al Operatorului, iar plata abonamentului Platformei se face prin Netopia Payments; în aceste cazuri furnizorii de plată acționează în nume propriu sau al Operatorului, nu ca sub-procesatori ai datelor din CRM.",
          "Orice adăugare sau înlocuire de sub-procesator se comunică Operatorului (prin email sau în Platformă) cu cel puțin 14 zile înainte, iar Operatorul se poate opune motivat în acest termen; dacă nu ajungem la o soluție, Operatorul poate înceta contractul.",
        ],
      },
      {
        titlu: "7. Transferuri în afara Spațiului Economic European",
        paragrafe: [
          "Transferurile către sub-procesatorii din lista A se bazează pe decizia de adecvare privind Cadrul UE–SUA de confidențialitate a datelor (pentru furnizorii certificați) sau pe clauzele contractuale standard (Decizia (UE) 2021/914), cu evaluarea riscurilor și măsuri suplimentare atunci când este necesar. Pentru serviciile din lista B, transferul este dispus de Operator prin conectarea contului propriu, iar mecanismul aplicabil este cel din contractul Operatorului cu furnizorul, pe care Operatorul îl verifică. Persoana împuternicită nu transferă date în afara SEE decât la instrucțiunile Operatorului sau când legea o impune. Baza de date a Platformei este găzduită în UE.",
        ],
      },
      {
        titlu: "8. Asistență pentru drepturile persoanelor vizate",
        paragrafe: [
          "Operatorul răspunde cererilor persoanelor vizate. Persoana împuternicită îl asistă prin mijloace tehnice și organizatorice adecvate: Platforma oferă export al datelor, căutare după adresa de email și ștergere/anonimizare (Setări → Cereri GDPR și panoul GDPR din profilul donatorului), precum și dezabonare de la emailurile de campanie. Dacă primim direct o cerere a unei persoane vizate privind datele Operatorului, i-o transmitem fără întârziere.",
          "Persoana împuternicită îl asistă pe Operator și la obligațiile din art. 32–36 GDPR (securitate, notificarea încălcărilor, evaluări de impact și consultare prealabilă), la dreptul de opoziție (art. 21) și la informarea datorată conform art. 14.",
        ],
      },
      {
        titlu: "9. Încălcări ale securității datelor",
        paragrafe: [
          "Persoana împuternicită notifică Operatorul fără întârzieri nejustificate, de regulă în cel mult 48 de ore de la luarea la cunoștință, despre orice încălcare a securității care afectează datele Operatorului, cu informațiile disponibile (natura incidentului, datele și persoanele afectate, măsurile luate), pentru ca Operatorul să își poată îndeplini obligațiile de notificare către autoritate și persoanele vizate.",
          "Punctul nostru de contact pentru incidente este vlad.placinta@alexandrit.ro (telefon 0757 401 042). Notificarea se trimite prin email către owner-ul și administratorii organizației din Platformă, iar Operatorul ne poate raporta o încălcare la aceeași adresă.",
        ],
      },
      {
        titlu: "10. Încetarea contractului: returnare și ștergere",
        paragrafe: [
          "Operatorul își poate exporta datele oricând, inclusiv după expirarea accesului (owner). Dacă accesul expiră și contul nu este reactivat, ștergem definitiv datele Operatorului la 90 de zile de la expirare, după două avertizări prin email (la 60 și la 83 de zile). Operatorul poate cere ștergerea mai devreme, din Setări sau în scris. Copiile de siguranță se șterg la expirarea ciclului lor normal. După finalizarea ștergerii o confirmăm Operatorului în scris, prin email către owner, în cel mult 14 zile.",
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
        titlu: "11 bis. Prospectarea B2B prin Agentul email",
        paragrafe: [
          "Operatorul este operator și răspunde pentru temeiul legal (inclusiv testul de echilibrare), pentru respectarea Legii 506/2004 privind comunicările comerciale și pentru informarea persoanelor din primul mesaj (art. 14 GDPR), inclusiv dreptul de opoziție și dezabonarea. Platforma oferă instrumentele (ciorne aprobate de om, șablon de informare, dezabonare, listă de suprimare), fără a garanta conformitatea utilizării lor. Persoana împuternicită nu trimite mesaje fără aprobarea expresă a unui utilizator al Operatorului. Textele-șablon sunt informative și nu țin loc de consultanță juridică.",
          "Valorile implicite de păstrare ale Agentului email (instrucțiuni pe care Operatorul le poate scurta oricând): 24 de luni pentru emailurile trimise și fragmentele de răspuns; 60 de zile pentru candidații neaprobați găsiți de furnizori; 12 luni de la „Nu mai contactăm” pentru fișele de influenceri, apoi rămâne doar o amprentă pseudonimizată, folosită exclusiv pentru a nu-i recontacta. Ștergerea la cerere se face prin funcțiile Platformei (Setări → Cereri GDPR).",
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
    actualizat: "November 4, 2026",
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
          "Nature and purpose: hosting and operating the application in which the Controller manages its CRM (contacts, donors, sponsors, volunteers, beneficiaries), campaign and donation pages, Form 230, communications (email, calls) initiated by the Controller, including automated donor email journeys started and edited by the Controller (recipients are chosen by donation history and are only donors who accepted the messages), and its reports;",
          "Public campaign page functions, for the purposes and on the bases set by the Controller: visit measurement (pseudonymised daily fingerprint, source, device, country; no cookies and no storage of the IP address; kept for 13 months) the monthly donor portal (e-mail with a link to manage the donation) and the donation widget embedded on the Controller's website (when the form loads we receive the IP address, the browser and the host website's domain, used to serve the page, for security and for aggregate statistics; no cookies; the Controller informs its visitors in its own privacy policy);",
          "Email agent (B2B prospecting) and Influencers, at the Controller's initiative: AI-assisted drafting of emails to professional contact persons at companies, approved and sent by the Controller's user; reading the replies through IMAP and saving fragments; an opening pixel, only if the Controller turns it on; files on influencers. Data: name, role, professional email, message content, technical opening data. Data subjects: contact persons at companies, influencers;",
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
          "The Processor does not transfer the Controller's data to third countries except on the Controller's instructions or where the law requires it.",
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
          "encryption of the API keys and credentials connected by the Controller (Anthropic, data providers, email accounts), which are never shown again after saving;",
          "authentication with email confirmation, rate limiting of repeated attempts, and security and audit logs for sensitive actions;",
          "database backups and limited access by our team to customer data;",
          "separation of environments and management of secrets outside the source code.",
        ],
      },
      {
        titlu: "6. Sub-processors",
        paragrafe: [
          "A. Sub-processors of the Processor. The Controller gives general authorization to use the sub-processors below. The Processor concludes a contract with each one imposing equivalent data protection obligations and remains liable to the Controller for them.",
        ],
        puncte: [
          "Vercel — application hosting;",
          "Supabase — database and authentication (EU region);",
          "the platform's web hosting provider (romania-webhosting.com) — the alexandrit.ro domain's email service, for emails sent at the Controller's request;",
          "Twilio — calls and messages, where the Controller enables the feature;",
          "Calendly — scheduling of advisors;",
          "Sentry — monitoring of the Platform's technical errors (without form or CRM data; page addresses are stripped of parameters and tokens);",
          "integration services enabled at the Controller's request (for example Make.com, Canva, Newsman, Brevo, Mailchimp, BoldSign) — only for the Controller that requests them.",
        ],
        incheiere: [
          "B. Services connected by the Controller with its own accounts, keys or mailboxes (Anthropic, Apollo, Lusha, Prospeo, Hunter, Waalaxy, the email servers of the Controller's colleagues). The Controller selects the provider, concludes the contract and terms directly (including the data processing terms and the transfer mechanism) and decides what data is sent. These providers are not sub-processors of the Processor, which is not liable for their processing under the Controller's account. The Processor's role is limited to (i) storing keys and credentials encrypted; (ii) transmitting, over an encrypted connection, only the data needed for the function started by the Controller or its user, as a documented instruction; (iii) not using returned data for other purposes. Depending on the function, the data sent may include: the campaign's title, amounts and link (the campaign story only if the Controller ticks the option in Settings and the campaign has diagnostic consent); the organization's file and the funder's requirements in Grants (without contacts and IBAN); in the Email agent, the company's CRM data, the contact person's name and role and the text of replies received (with emails, phones, IBAN and personal ID numbers removed); in the web search for decision-makers, the company's name, tax ID, locality, website and administrator; in the ad analysis, aggregated data per campaign; in Influencers, the public name, category and city. The Controller undertakes not to send health data or beneficiaries' data without a legal basis and without anonymisation. The Controller is responsible for the Art. 28 contract with each provider (or, where the provider acts as a controller of its own databases, for the lawfulness of obtaining that data), the legal basis, informing data subjects (Art. 13–14), the transfers made through these services, and for connecting only professional mailboxes it is entitled to connect, with the holder's knowledge.",
          "Donation payments go directly into the Controller's own Stripe account, and the Platform subscription is paid through Netopia Payments; in those cases the payment providers act on their own behalf or on the Controller's, not as sub-processors of CRM data.",
          "Any addition or replacement of a sub-processor is communicated to the Controller (by email or in the Platform) at least 14 days in advance, and the Controller may object on reasonable grounds within that period; if no solution is found, the Controller may terminate the contract.",
        ],
      },
      {
        titlu: "7. Transfers outside the European Economic Area",
        paragrafe: [
          "Transfers to the sub-processors in list A rely on the adequacy decision on the EU–US Data Privacy Framework (for certified providers) or on the standard contractual clauses (Decision (EU) 2021/914), with a risk assessment and additional measures where necessary. For the services in list B, the transfer is ordered by the Controller by connecting its own account, and the applicable mechanism is the one in the Controller's contract with the provider, which the Controller checks. The Processor does not transfer data outside the EEA except on the Controller's instructions or where the law requires it. The Platform's database is hosted in the EU.",
        ],
      },
      {
        titlu: "8. Assistance with data subject rights",
        paragrafe: [
          "The Controller answers data subjects' requests. The Processor assists it through appropriate technical and organizational means: the Platform offers data export, search by email address and deletion/anonymization (Settings → GDPR requests and the GDPR panel on a donor's profile), as well as unsubscribing from campaign emails. If we receive a data subject's request about the Controller's data directly, we forward it without delay.",
          "The Processor also assists the Controller with the obligations in Articles 32–36 GDPR (security, breach notification, impact assessments and prior consultation), with the right to object (Art. 21) and with the information owed under Art. 14.",
        ],
      },
      {
        titlu: "9. Personal data breaches",
        paragrafe: [
          "The Processor notifies the Controller without undue delay, as a rule within 48 hours of becoming aware, of any security breach affecting the Controller's data, with the information available (nature of the incident, data and people affected, measures taken), so that the Controller can meet its notification obligations to the authority and data subjects.",
          "Our contact point for incidents is vlad.placinta@alexandrit.ro (phone +40 757 401 042). The notice is sent by email to the owner and the administrators of the organization on the Platform, and the Controller can report a breach to us at the same address.",
        ],
      },
      {
        titlu: "10. Termination: return and deletion",
        paragrafe: [
          "The Controller can export its data at any time, including after access has expired (owner). If access expires and the account is not reactivated, we permanently delete the Controller's data 90 days after expiry, after two email warnings (at 60 and 83 days). The Controller may request earlier deletion, from Settings or in writing. Backups are deleted when their normal cycle ends. Once the deletion is complete we confirm it to the Controller in writing, by email to the owner, within 14 days.",
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
        titlu: "11 bis. B2B prospecting through the Email agent",
        paragrafe: [
          "The Controller is the controller and is responsible for the legal basis (including the balancing test), for compliance with Law 506/2004 on commercial communications and for informing the people concerned in the first message (Art. 14 GDPR), including the right to object and unsubscribing. The Platform provides the tools (drafts approved by a human, an information template, unsubscribing, a suppression list) without guaranteeing the compliance of their use. The Processor does not send messages without the express approval of a user of the Controller. The template texts are informative and do not replace legal advice.",
          "Default retention periods of the Email agent (instructions the Controller may shorten at any time): 24 months for sent emails and reply fragments; 60 days for unapproved candidates found by providers; 12 months from “Do not contact again” for influencer files, after which only a pseudonymised fingerprint remains, used solely to avoid contacting them again. Deletion on request is done through the Platform's functions (Settings → GDPR requests).",
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
