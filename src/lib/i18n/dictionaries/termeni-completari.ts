// Punctele adăugate la Termenii și condițiile platformei (octombrie 2026): campanii, plăți, comunicări, date speciale, despăgubire, încetare și export,
// antispălare, accesibilitate, conținut găzduit, AI, calitatea de profesionist și ordinea documentelor. Se inserează în termeni.ts ca puncte 21–32.
type Sectiune = { titlu: string; paragrafe?: string[]; puncte?: string[]; incheiere?: string[] };

export const COMPLETARI_TERMENI: { ro: Sectiune[]; en: Sectiune[] } = {
  ro: [
    {
      titlu: "21. Campanii de strângere de fonduri: răspunderea Organizației",
      paragrafe: [
        "Organizația răspunde exclusiv pentru campaniile pe care le publică: veridicitatea și actualitatea informațiilor, folosirea sumelor strânse conform scopului anunțat, informarea donatorilor, evidența contabilă și respectarea legislației aplicabile (inclusiv legislația privind asociațiile și fundațiile, sponsorizarea, redirecționarea impozitului, voluntariatul, protecția datelor și, unde este cazul, regulile privind colectele publice).",
        "Putem activa încasarea donațiilor pentru o Organizație numai după o verificare prealabilă a identității și a scopului ei, la discreția noastră. Aceasta este o măsură internă de prevenire a abuzurilor și nu este o garanție, nici o certificare, față de donatori sau terți. Nu afișăm mențiuni de tip „organizație verificată” și nu garantăm că o campanie va atinge ținta.",
        "Alexandrit nu organizează campaniile, nu strânge fonduri în nume propriu, nu primește, nu păstrează și nu redistribuie sumele donate și nu acționează ca intermediar de plăți sau reprezentant al donatorilor.",
        "Organizația nu publică campanii înșelătoare, discriminatorii sau care încalcă drepturile altora și obține, înainte de publicare, acordurile necesare pentru imagini, povești și date ale beneficiarilor. Putem retrage sau suspenda o campanie, inclusiv fără notificare prealabilă dacă riscul o cere, dacă avem motive întemeiate să credem că încalcă legea sau acești Termeni sau la solicitarea unei autorități.",
      ],
    },
    {
      titlu: "22. Plăți, rambursări și chargeback-uri",
      paragrafe: [
        "Plățile donațiilor sunt procesate de procesatorul de plăți al Organizației (în principal Stripe, în contul propriu al Organizației, inclusiv metodele pe care ea le activează acolo, de exemplu Apple Pay, Google Pay, PayPal sau Revolut Pay). Relația pentru procesare se formează direct între Organizație și procesator. Alexandrit nu este instituție de plată și nu are acces la datele cardului.",
        "Taxele procesatorului sunt datorate de Organizație procesatorului. La data acestor Termeni, Alexandrit nu reține comision din donații. Abonamentul platformei se plătește separat, prin procesatorul nostru de plăți.",
        "Rambursările, contestațiile bancare (chargeback) și taxele aferente se gestionează între Organizație, procesator și donator și sunt în sarcina Organizației. Alexandrit nu operează rambursări; la cererea Organizației putem oferi suport tehnic pentru a le iniția în contul ei de procesare. Donațiile lunare pot fi oprite oricând de donator, din linkul de gestionare primit pe e-mail.",
      ],
    },
    {
      titlu: "23. Comunicări electronice și consimțăminte",
      paragrafe: [
        "Organizația răspunde pentru legalitatea comunicărilor trimise prin Platformă (e-mail, mesaje, grupuri de mesagerie): temei legal valid, informarea persoanelor, respectarea opțiunilor de dezabonare și păstrarea dovezilor.",
        "Pentru comunicările comerciale prin e-mail, SMS sau sisteme automate se folosește, ca regulă prudentă, consimțământul prealabil al destinatarului, potrivit legislației privind comunicațiile electronice (Legea nr. 506/2004). O donație nu se tratează ca vânzare de produse sau servicii: Organizația nu se bazează pe excepția pentru clienți existenți fără să se fi consultat cu un specialist.",
        "Este interzisă folosirea listelor cumpărate sau obținute fără temei legal. Platforma pune la dispoziție instrumente (opțiuni de consimțământ separate, link de dezabonare, listă de suprimare); acestea nu înlocuiesc obligațiile Organizației. Putem suspenda trimiterile în caz de plângeri sau rate de abuz ridicate.",
      ],
    },
    {
      titlu: "24. Date personale speciale",
      paragrafe: [
        "Pe lângă punctul 9: Organizația nu introduce în câmpuri libere date medicale identificabile decât cu consimțământul explicit al persoanei sau al reprezentantului ei legal (art. 9 alin. (2) lit. a din GDPR) și poate fi rugată să dovedească acordurile obținute. Nu le publică și nu include date ale beneficiarilor în mesajele afișate public fără temei. Pentru campaniile medicale sau cu minori, Organizația evaluează dacă îi revine o evaluare a impactului asupra protecției datelor (DPIA).",
      ],
    },
    {
      titlu: "25. Despăgubire (pentru Clienții profesioniști)",
      paragrafe: [
        "„Client profesionist” înseamnă persoana juridică sau persoana fizică care acționează în scop profesional (nu consumator). Acesta ne despăgubește pentru pretențiile terților (donatori, beneficiari, autorități) generate de conținutul campaniilor sale, de modul în care folosește fondurile, de încălcarea legii sau a acestor Termeni ori de datele introduse de el, cu condiția să-l anunțăm prompt, să-i permitem să conducă apărarea și să cooperăm rezonabil.",
        "Clauza nu acoperă pretențiile cauzate de intenția sau culpa gravă a noastră și nu include amenzile aplicate nouă. Prin acceptarea acestor Termeni, Clientul profesionist declară că a citit și acceptă expres această clauză.",
      ],
    },
    {
      titlu: "26. Suspendare, încetare, export și ștergere",
      paragrafe: [
        "Putem suspenda sau închide accesul imediat în caz de fraudă, risc legal sau de securitate, neplată (punctul 6) ori solicitare a unei autorități, comunicând motivele cât mai curând posibil, cu excepția cazurilor în care legea interzice divulgarea.",
        "După încetarea contractului, Clientul are 30 de zile să-și exporte datele și să solicite migrarea lor. Ulterior, la alegerea Clientului, datele personale pentru care acționăm ca persoană împuternicită se returnează sau se șterg, în termen de 30 de zile (vezi și Acordul de prelucrare a datelor, DPA). Datele pe care legea ne obligă să le păstrăm (de exemplu documente contabile) rămân arhivate cât cere legea.",
      ],
    },
    {
      titlu: "27. Prevenirea spălării banilor și sancțiuni",
      paragrafe: [
        "Clientul declară că fondurile strânse provin și vor fi folosite în scopuri licite. Nu folosește Platforma în legătură cu persoane sau entități vizate de măsuri restrictive ale Uniunii Europene sau ale legii române și nu finanțează activități ilegale. Putem solicita informații suplimentare, refuza sau suspenda serviciile și coopera cu autoritățile competente atunci când legea o cere. Nu efectuăm verificări ale donatorilor.",
      ],
    },
    {
      titlu: "28. Accesibilitate",
      paragrafe: [
        "Urmărim alinierea Platformei și a paginilor publice de donații la standardul EN 301 549 / WCAG 2.1 nivel AA, fără a garanta conformitatea deplină. Organizația răspunde de accesibilitatea conținutului publicat de ea (de exemplu text alternativ pentru imagini, contrast suficient).",
      ],
    },
    {
      titlu: "29. Conținut găzduit și notificări",
      paragrafe: [
        "Mesajele donatorilor și textele campaniilor sunt conținut găzduit. Orice persoană ne poate notifica un conținut ilegal la vlad.placinta@alexandrit.ro, cu motivarea și adresa paginii. Analizăm cererile fără întârziere nejustificată, putem ascunde conținutul și comunicăm decizia și posibilitățile de contestare.",
      ],
    },
    {
      titlu: "30. Funcții de inteligență artificială",
      paragrafe: [
        "Dacă folosești funcții care generează texte cu ajutorul inteligenței artificiale, Organizația verifică și răspunde de conținutul generat și publicat. Nu introduce în solicitări date sensibile sau ale unor terți decât dacă are temei și acordurile necesare. Textele generate se marchează ca atare acolo unde legea o cere.",
      ],
    },
    {
      titlu: "31. Calitatea de profesionist și consumatorii",
      paragrafe: [
        "Prin crearea contului, persoana care îl creează declară că acționează în numele unei organizații sau în scop profesional, nu ca consumator. Platforma se adresează profesioniștilor.",
        "Dacă totuși un consumator încheie un abonament, i se aplică regulile imperative de protecție a consumatorilor: informare precontractuală, dreptul de retragere acolo unde legea îl prevede (cu acordul expres privind furnizarea imediată a conținutului digital și confirmarea pierderii dreptului), precum și competența instanțelor potrivit legii. Informații despre soluționarea alternativă a litigiilor: Autoritatea Națională pentru Protecția Consumatorilor (anpc.ro).",
      ],
    },
    {
      titlu: "32. Ordinea documentelor",
      paragrafe: [
        "Contractul cuprinde acești Termeni, Politica de confidențialitate (GDPR), Politica de cookies și, pentru datele personale din contul Clientului, Acordul de prelucrare a datelor (DPA). În caz de contradicție privind prelucrarea datelor personale prevalează DPA; în rest, prevalează Termenii.",
      ],
    },
  ],
  en: [
    {
      titlu: "21. Fundraising campaigns: the Organization's responsibility",
      paragrafe: [
        "The Organization is solely responsible for the campaigns it publishes: the accuracy and currency of the information, using the funds raised for the announced purpose, informing donors, bookkeeping and complying with applicable law (including law on associations and foundations, sponsorship, tax redirection, volunteering, data protection and, where relevant, rules on public collections).",
        "We may enable donation collection for an Organization only after a prior check of its identity and purpose, at our discretion. This is an internal abuse-prevention measure and is not a guarantee or certification towards donors or third parties. We do not display “verified organization” badges and do not guarantee that a campaign will reach its goal.",
        "Alexandrit does not organize campaigns, does not raise funds in its own name, does not receive, hold or redistribute donated funds and does not act as a payment intermediary or representative of donors.",
        "The Organization does not publish misleading or discriminatory campaigns or ones that infringe others' rights, and obtains, before publishing, the consents needed for images, stories and beneficiary data. We may withdraw or suspend a campaign, including without prior notice if the risk requires it, if we have reasonable grounds to believe it breaches the law or these Terms, or at an authority's request.",
      ],
    },
    {
      titlu: "22. Payments, refunds and chargebacks",
      paragrafe: [
        "Donations are processed by the Organization's payment processor (mainly Stripe, in the Organization's own account, including the methods it enables there, such as Apple Pay, Google Pay, PayPal or Revolut Pay). The processing relationship is formed directly between the Organization and the processor. Alexandrit is not a payment institution and has no access to card data.",
        "Processor fees are owed by the Organization to the processor. As of the date of these Terms, Alexandrit takes no commission on donations. The platform subscription is paid separately, through our payment processor.",
        "Refunds, bank disputes (chargebacks) and related fees are handled between the Organization, the processor and the donor and are the Organization's responsibility. Alexandrit does not process refunds; at the Organization's request we can give technical support to initiate them in its processing account. Monthly donors can stop their donation at any time from the management link received by e-mail.",
      ],
    },
    {
      titlu: "23. Electronic communications and consents",
      paragrafe: [
        "The Organization is responsible for the lawfulness of communications sent through the Platform (e-mail, messages, messaging groups): a valid legal basis, informing individuals, honoring unsubscribe choices and keeping proof.",
        "For commercial communications by e-mail, SMS or automated systems, the prudent rule is the recipient's prior consent, under electronic communications law (Law no. 506/2004). A donation is not treated as a sale of products or services: the Organization does not rely on the existing-customer exception without specialist advice.",
        "Purchased lists, or lists obtained without a legal basis, must not be used. The Platform provides tools (separate consent options, unsubscribe link, suppression list); they do not replace the Organization's obligations. We may suspend sending in case of complaints or high abuse rates.",
      ],
    },
    {
      titlu: "24. Special categories of personal data",
      paragrafe: [
        "In addition to point 9: the Organization does not enter identifiable medical data in free-text fields unless it has the explicit consent of the person or their legal representative (Art. 9(2)(a) GDPR), and may be asked to prove the consents obtained. It does not publish them or include beneficiary data in publicly displayed messages without a basis. For medical or minor-related campaigns, the Organization assesses whether a data protection impact assessment (DPIA) is required.",
      ],
    },
    {
      titlu: "25. Indemnification (for Professional Customers)",
      paragrafe: [
        "“Professional Customer” means a legal entity or an individual acting for professional purposes (not a consumer). They indemnify us against third-party claims (donors, beneficiaries, authorities) arising from their campaign content, how they use funds, breach of law or these Terms, or the data they enter, provided we notify them promptly, let them lead the defense and cooperate reasonably.",
        "This clause does not cover claims caused by our intent or gross negligence and does not include fines imposed on us. By accepting these Terms, the Professional Customer declares that they have read and expressly accept this clause.",
      ],
    },
    {
      titlu: "26. Suspension, termination, export and deletion",
      paragrafe: [
        "We may suspend or close access immediately in case of fraud, legal or security risk, non-payment (point 6) or an authority's request, giving the reasons as soon as possible, except where the law prohibits disclosure.",
        "After the contract ends, the Customer has 30 days to export their data and request migration. Afterwards, at the Customer's choice, the personal data we process as a processor is returned or deleted within 30 days (see also the Data Processing Agreement, DPA). Data we must keep by law (for example accounting documents) remains archived as long as the law requires.",
      ],
    },
    {
      titlu: "27. Anti-money laundering and sanctions",
      paragrafe: [
        "The Customer declares that the funds raised come from and will be used for lawful purposes. They do not use the Platform in connection with persons or entities subject to restrictive measures of the European Union or Romanian law, and do not finance illegal activities. We may request additional information, refuse or suspend services and cooperate with the competent authorities when the law requires. We do not carry out checks on donors.",
      ],
    },
    {
      titlu: "28. Accessibility",
      paragrafe: [
        "We aim to align the Platform and public donation pages with EN 301 549 / WCAG 2.1 level AA, without guaranteeing full conformity. The Organization is responsible for the accessibility of the content it publishes (for example alternative text for images, sufficient contrast).",
      ],
    },
    {
      titlu: "29. Hosted content and notices",
      paragrafe: [
        "Donors' messages and campaign texts are hosted content. Anyone can notify us of illegal content at vlad.placinta@alexandrit.ro, with the reasons and the page address. We review requests without undue delay, may hide the content, and communicate the decision and the ways to contest it.",
      ],
    },
    {
      titlu: "30. Artificial intelligence features",
      paragrafe: [
        "If you use features that generate text with artificial intelligence, the Organization checks and is responsible for the content generated and published. It does not enter sensitive data or third parties' data in requests unless it has a basis and the necessary consents. Generated texts are labeled as such where the law requires.",
      ],
    },
    {
      titlu: "31. Professional capacity and consumers",
      paragrafe: [
        "By creating the account, the person creating it declares that they act on behalf of an organization or for professional purposes, not as a consumer. The Platform is intended for professionals.",
        "If a consumer nevertheless takes out a subscription, mandatory consumer protection rules apply: pre-contractual information, the right of withdrawal where the law provides it (with express consent to immediate supply of digital content and confirmation of the loss of the right), and the jurisdiction of courts under the law. Information on alternative dispute resolution: the National Authority for Consumer Protection (anpc.ro).",
      ],
    },
    {
      titlu: "32. Order of documents",
      paragrafe: [
        "The contract consists of these Terms, the Privacy Policy (GDPR), the Cookies Policy and, for personal data in the Customer's account, the Data Processing Agreement (DPA). In case of contradiction concerning the processing of personal data the DPA prevails; otherwise the Terms prevail.",
      ],
    },
  ],
};
