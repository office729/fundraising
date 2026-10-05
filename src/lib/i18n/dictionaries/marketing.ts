import type { Locale } from "../config";

export const MARKETING_DICT = {
  ro: {
    topbar: {
      help: "Ai nevoie de ajutor?",
      caseStudies: "Studii de Caz",
      blog: "Blog",
      contact: "Contact",
    },
    nav: [
      { href: "/", label: "Acasă" },
      { href: "/cine-suntem", label: "Cine suntem?" },
      { href: "/ce-facem", label: "Ce facem?" },
      { href: "/hub", label: "Hub Fundraising" },
      { href: "/automatizari", label: "Automatizări" },
      { href: "/contact", label: "Contact" },
    ],
    // Sub-paginile din „Cine suntem?" (meniu derulant în antet, indentate în meniul de mobil).
    navCineSuntem: [
      { href: "/vlad-placinta", label: "Vlad Plăcintă" },
      { href: "/premii", label: "Premii Vlad Plăcintă" },
      { href: "/portofoliu", label: "Portofoliu" },
    ],
    header: {
      consulting: "Consiliere 1 la 1",
      login: "Autentificare",
      signup: "Începe gratuit",
      openMenu: "Deschide meniul",
      closeMenu: "Închide meniul",
    },
    hero: {
      titlePre: "Platforma care organizează ",
      titleHighlight: "donatorii, companiile și campaniile",
      titlePost: " ONG-ului tău",
      ctaPrimary: "Începe trial gratuit",
      ctaSecondary: "Vezi platforma →",
      stats: [
        { n: "28M€+", l: "strânși pentru cauze umanitare" },
        { n: "9", l: "instrumente incluse în platformă" },
        { n: "30 zile", l: "trial gratuit, fără card" },
      ],
    },
    platforma: {
      title: "Tot ce are nevoie ONG-ul tău, într-un singur loc",
      items: [
        { n: "01", t: "CRM Donatori", d: "Toți donatorii persoane fizice, cu istoric complet de donații, segmentare și notițe — populat automat din paginile de colectare." },
        { n: "02", t: "CRM Companii & Sponsorizări", d: "Urmărești firmele partenere de la primul contact până la contract semnat și sponsorizare încasată." },
        { n: "03", t: "Pagini de donație online", d: "Creezi o pagină de colectare pentru fiecare caz, accepți donații cu cardul, iar donatorul primește automat mesaj și email de mulțumire." },
        { n: "04", t: "Instrumente de lucru", d: "Newsletter, rapoarte de activitate, one-pager pentru companii, program de lucru al echipei — generate din datele tale reale." },
        { n: "05", t: "Formularul 230", d: "Link propriu pentru ONG-ul tău, unde donatorii completează online Formularul 230 pentru redirecționarea a 3,5% din impozit." },
        { n: "06", t: "Acces pe roluri, pentru toată echipa", d: "Fiecare coleg are cont propriu, cu acces controlat — de la voluntari la coordonator." },
      ],
    },
    valori: {
      title: "De ce Alexandrit?",
      items: [
        { t: "Construită pe o fundație solidă, care a strâns 28M€", d: "Fiecare instrument pornește din nevoi reale, testate în activitatea Asociației Salvează o Inimă, nu din presupuneri." },
        { t: "Toate instrumentele, într-un singur abonament", d: "CRM, pagini de donație, rapoarte și newslettere — nu plătești separat pentru fiecare unealtă, doar pentru capacitate." },
        { t: "Trial complet, 30 de zile, fără card", d: "Testezi platforma cu datele tale reale înainte să te decizi — fără angajament, fără card bancar." },
      ],
    },
    testimoniale: {
      title: "Cuvinte frumoase, oameni frumoși",
      items: [
        {
          citat:
            "Am primit sprijin și încurajare din partea domnului Vlad Plăcintă pe tot parcursul colaborării noastre, dar mai ales în momentele cele mai complicate.",
          nume: "Alexandra Nadane",
          rol: "Președinte — Centrele ROUA",
        },
        {
          citat:
            "Vlad Plăcintă, prin cunoștințele sale, ne-a ajutat să creăm campanii eficiente și să ne fidelizăm donatorii. Colaborarea cu el a fost esențială.",
          nume: "Ionela Ivan",
          rol: "Președinte — Asociația HAPPY",
        },
        {
          citat: "M-a ajutat să înțeleg cu adevărat ce înseamnă fundraising pentru cauza noastră. Am reușit să ne atingem obiectivele.",
          nume: "Gabriela Ivan",
          rol: "Președinte — A.P.C.A Botoșani",
        },
        {
          citat:
            "Colaborarea cu Vlad Plăcintă a fost esențială pentru succesul nostru în fundraising. Expertiza sa ne-a ajutat să ne atingem obiectivele cu ușurință.",
          nume: "Diana Alexandroae",
          rol: "Președinte — Asociația ANAID",
        },
      ],
    },
    intrebariFrecvente: {
      title: "Întrebări frecvente",
      items: [
        {
          intrebare: "De ce să aleg un CRM dedicat ONG-urilor în locul unui CRM general?",
          raspuns:
            "În fundraising, relația cu un donator continuă mult după prima donație. Ai nevoie să urmărești istoricul sprijinului, campaniile susținute, comunicările și următorul contact. Alexandrit este conceput în jurul acestor nevoi, pentru ca echipa să poată transforma datele în relații durabile și sprijin pentru misiunea organizației.",
        },
        {
          intrebare: "Un CRM internațional gratuit este suficient pentru un ONG din România?",
          raspuns:
            "Poate fi un punct de plecare pentru o echipă mică, cu nevoi simple. Pe măsură ce cresc baza de donatori și numărul campaniilor, contează cât de ușor poți urmări donațiile, sponsorizările și activitatea echipei. Evaluează atât costul abonamentului, cât și timpul necesar pentru configurare și administrare.",
        },
        {
          intrebare: "Cum compar costul Alexandrit cu cel al unui CRM internațional?",
          raspuns:
            "Compară costul total pentru întreaga echipă: abonamentul, numărul de utilizatori, configurarea, migrarea datelor și funcțiile suplimentare. Pentru un ONG, valoarea unui CRM se vede și în timpul economisit, în contactele urmărite la timp și în claritatea rapoartelor de fundraising.",
        },
        {
          intrebare: "De ce contează formularele 230, D177 și sponsorizările în alegerea unui CRM?",
          raspuns:
            "Pentru ONG-urile din România, acestea fac parte din activitatea de atragere a fondurilor. Un CRM potrivit trebuie evaluat și după felul în care ajută echipa să urmărească persoanele și companiile contactate, documentele, stadiul solicitărilor și termenele. Funcțiile și integrările disponibile trebuie verificate înainte de alegerea platformei.",
        },
        {
          intrebare: "Este Alexandrit potrivit și pentru ONG-uri din alte domenii decât cel medical?",
          raspuns:
            "Alexandrit este gândit pentru fundraisingul ONG-urilor, indiferent de cauza susținută: educație, sănătate, mediu, cultură sau sprijin social. Nevoile comune sunt relațiile cu donatorii și sponsorii, organizarea campaniilor și coordonarea echipei. Modul de lucru trebuie adaptat misiunii fiecărei organizații.",
        },
        {
          intrebare: "Cum poate un CRM să ajute un ONG să atragă mai multe fonduri?",
          raspuns:
            "Prin organizarea informațiilor și urmărirea consecventă a relațiilor. Când echipa știe cine a donat, cine trebuie contactat și ce discuții sunt în desfășurare, poate comunica mai relevant și poate reveni la momentul potrivit. Rezultatele depind de strategie și de oameni; CRM-ul le susține munca.",
        },
      ],
    },
    footer: {
      tagline: "Platforma CRM pentru ONG-uri din România.",
      contactTitle: "Contact",
      contact: [
        { rol: "Consiliere", nume: "Vlad Plăcintă", email: "vlad.placinta@alexandrit.ro", telefon: "0757 401 042", tel: "0757401042" },
        { rol: "Suport tehnic", nume: "Andrei Plăcintă", email: "andrei.placinta@alexandrit.ro", telefon: "0721 425 650", tel: "0721425650" },
      ],
      anpcTitle: "Protecția consumatorilor",
      anpc: [
        { label: "ANPC — SAL", sub: "Soluționarea alternativă a litigiilor", href: "https://anpc.ro/ce-este-sal/" },
        { label: "SOL", sub: "Soluționarea online a litigiilor (UE)", href: "https://ec.europa.eu/consumers/odr" },
      ],
      companyTitle: "Operator",
      company: [
        "MEDIGROUPPLUS SRL",
        "CUI 38103518 · J07/617/2017",
        "Str. Prieteniei nr. 4, sat Boscoteni, com. Frumușica, jud. Botoșani",
      ],
      objectiveTitle: "Obiectivul nostru",
      objective: "Să educăm și să sprijinim ONG-urile în crearea de campanii de fundraising eficiente, oferindu-le instrumentele și cunoștințele necesare pentru a atrage donatori și a-și susține cauzele.",
      navTitle: "Navigare",
      nav: [
        { href: "/cine-suntem", label: "Cine suntem?" },
        { href: "/portofoliu", label: "Portofoliu" },
        { href: "/vlad-placinta", label: "Vlad Plăcintă" },
        { href: "/premii", label: "Premii Vlad Plăcintă" },
        { href: "/hub", label: "Hub Fundraising" },
        { href: "/portofoliu-clienti", label: "Portofoliu Clienți" },
        { href: "/contact", label: "Contact" },
        { href: "/", label: "Program Training" },
      ],
      legalTitle: "Legal & contact",
      terms: "Termeni și condiții",
      dpa: "Acord de prelucrare (DPA)",
      gdpr: "Politica GDPR",
      cookies: "Politica de cookies",
      location: "Botoșani",
    },
  },
  en: {
    topbar: {
      help: "Need help?",
      caseStudies: "Case Studies",
      blog: "Blog",
      contact: "Contact",
    },
    nav: [
      { href: "/", label: "Home" },
      { href: "/cine-suntem", label: "About us" },
      { href: "/ce-facem", label: "What we do" },
      { href: "/hub", label: "Fundraising Hub" },
      { href: "/automatizari", label: "Automation" },
      { href: "/contact", label: "Contact" },
    ],
    navCineSuntem: [
      { href: "/vlad-placinta", label: "Vlad Plăcintă" },
      { href: "/premii", label: "Vlad Plăcintă Awards" },
      { href: "/portofoliu", label: "Portfolio" },
    ],
    header: {
      consulting: "1-on-1 Consulting",
      login: "Log in",
      signup: "Start free",
      openMenu: "Open menu",
      closeMenu: "Close menu",
    },
    hero: {
      titlePre: "The platform that organizes ",
      titleHighlight: "your donors, companies and campaigns",
      titlePost: "",
      ctaPrimary: "Start free trial",
      ctaSecondary: "See the platform →",
      stats: [
        { n: "€28M+", l: "raised for humanitarian causes" },
        { n: "9", l: "tools included in the platform" },
        { n: "30 days", l: "free trial, no card" },
      ],
    },
    platforma: {
      title: "Everything your NGO needs, in one place",
      items: [
        { n: "01", t: "Donor CRM", d: "Every individual donor, with full donation history, segmentation and notes — populated automatically from your donation pages." },
        { n: "02", t: "Company CRM & sponsorships", d: "Track partner companies from first contact through signed contract and received sponsorship." },
        { n: "03", t: "Online donation pages", d: "Create a donation page for each case, accept card payments, and the donor automatically gets a thank-you message and email." },
        { n: "04", t: "Working tools", d: "Newsletters, activity reports, company one-pagers, team work schedules — generated from your real data." },
        { n: "05", t: "Form 230", d: "A dedicated link for your NGO where donors fill in Form 230 online to redirect 3.5% of their income tax." },
        { n: "06", t: "Role-based access for the whole team", d: "Every teammate gets their own account, with controlled access — from volunteers to the coordinator." },
      ],
    },
    valori: {
      title: "Why Alexandrit?",
      items: [
        { t: "Built on a solid foundation that raised €28M", d: "Every tool starts from a real need, tested in Asociația Salvează o Inimă's own work — not from guesswork." },
        { t: "Every tool, in one subscription", d: "CRM, donation pages, reports and newsletters — you don't pay separately per tool, only for capacity." },
        { t: "Full 30-day trial, no card", d: "Test the platform with your real data before you decide — no commitment, no bank card." },
      ],
    },
    testimoniale: {
      title: "Kind words, kind people",
      items: [
        {
          citat:
            "We received support and encouragement from Mr. Vlad Plăcintă throughout our entire collaboration, especially during the most difficult moments.",
          nume: "Alexandra Nadane",
          rol: "President — Centrele ROUA",
        },
        {
          citat:
            "Vlad Plăcintă's expertise helped us build effective campaigns and build donor loyalty. Working with him was essential.",
          nume: "Ionela Ivan",
          rol: "President — Asociația HAPPY",
        },
        {
          citat: "He helped me truly understand what fundraising means for our cause. We managed to reach our goals.",
          nume: "Gabriela Ivan",
          rol: "President — A.P.C.A Botoșani",
        },
        {
          citat:
            "Working with Vlad Plăcintă was essential to our fundraising success. His expertise helped us reach our goals with ease.",
          nume: "Diana Alexandroae",
          rol: "President — Asociația ANAID",
        },
      ],
    },
    intrebariFrecvente: {
      title: "Frequently asked questions",
      items: [
        {
          intrebare: "Why choose a CRM built for NGOs instead of a general-purpose CRM?",
          raspuns:
            "In fundraising, the relationship with a donor continues long after their first gift. You need to track their giving history, the campaigns they supported, your communications and the next touchpoint. Alexandrit is built around these needs, so your team can turn data into lasting relationships and support for your mission.",
        },
        {
          intrebare: "Is a free international CRM enough for a Romanian NGO?",
          raspuns:
            "It can be a starting point for a small team with simple needs. As your donor base and number of campaigns grow, it matters how easily you can track donations, sponsorships and your team's activity. Weigh both the subscription cost and the time needed to set up and maintain it.",
        },
        {
          intrebare: "How do I compare Alexandrit's cost to an international CRM?",
          raspuns:
            "Compare the total cost for your whole team: the subscription, number of users, setup, data migration and add-on features. For an NGO, a CRM's value also shows up in time saved, contacts followed up on time, and clear fundraising reports.",
        },
        {
          intrebare: "Why do Form 230, D177 and sponsorships matter when choosing a CRM?",
          raspuns:
            "For Romanian NGOs, these are part of day-to-day fundraising. The right CRM should be judged on how well it helps your team track the people and companies contacted, documents, request status and deadlines. Check the available features and integrations before choosing a platform.",
        },
        {
          intrebare: "Is Alexandrit a good fit for NGOs outside the medical field?",
          raspuns:
            "Alexandrit is built for NGO fundraising regardless of cause — education, health, environment, culture or social support. The common needs are donor and sponsor relationships, campaign organization and team coordination. How you work should be adapted to your organization's own mission.",
        },
        {
          intrebare: "How can a CRM help an NGO raise more funds?",
          raspuns:
            "By organizing information and consistently following up on relationships. When your team knows who gave, who needs a follow-up and which conversations are in progress, it can communicate more relevantly and reach out at the right moment. Results depend on strategy and people — the CRM supports that work.",
        },
      ],
    },
    footer: {
      tagline: "The CRM platform for NGOs in Romania.",
      contactTitle: "Contact",
      contact: [
        { rol: "Consulting", nume: "Vlad Plăcintă", email: "vlad.placinta@alexandrit.ro", telefon: "0757 401 042", tel: "0757401042" },
        { rol: "Technical support", nume: "Andrei Plăcintă", email: "andrei.placinta@alexandrit.ro", telefon: "0721 425 650", tel: "0721425650" },
      ],
      anpcTitle: "Consumer protection",
      anpc: [
        { label: "ANPC — SAL", sub: "Alternative dispute resolution", href: "https://anpc.ro/ce-este-sal/" },
        { label: "SOL", sub: "EU online dispute resolution", href: "https://ec.europa.eu/consumers/odr" },
      ],
      companyTitle: "Operator",
      company: [
        "MEDIGROUPPLUS SRL",
        "Tax ID 38103518 · J07/617/2017",
        "Str. Prieteniei nr. 4, Boscoteni village, Frumușica commune, Botoșani county",
      ],
      objectiveTitle: "Our objective",
      objective: "To educate and support NGOs in building effective fundraising campaigns, giving them the tools and knowledge they need to attract donors and support their causes.",
      navTitle: "Navigation",
      nav: [
        { href: "/cine-suntem", label: "About us" },
        { href: "/portofoliu", label: "Portfolio" },
        { href: "/vlad-placinta", label: "Vlad Plăcintă" },
        { href: "/premii", label: "Vlad Plăcintă Awards" },
        { href: "/hub", label: "Fundraising Hub" },
        { href: "/portofoliu-clienti", label: "Client Portfolio" },
        { href: "/contact", label: "Contact" },
        { href: "/", label: "Training Program" },
      ],
      legalTitle: "Legal & contact",
      terms: "Terms & conditions",
      dpa: "Data Processing Agreement (DPA)",
      gdpr: "Privacy policy",
      cookies: "Cookie policy",
      location: "Botoșani, Romania",
    },
  },
} satisfies Record<Locale, unknown>;

export type MarketingDict = (typeof MARKETING_DICT)["ro"];
