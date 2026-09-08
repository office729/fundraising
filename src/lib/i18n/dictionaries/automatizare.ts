import type { Locale } from "../config";

export const AUTOMATIZARE_DICT = {
  ro: {
    h1: "Automatizare, integrări și platforme construite pentru ONG-ul tău",
    subtitlu: "De la automatizări Make.com și integrarea sistemelor de plată și semnătură digitală, până la o platformă completă de fundraising sau un website nou — construim exact ce are nevoie organizația ta.",
    servicii: [
      { titlu: "Automatizare Make.com", desc: "Fluxuri automate între CRM, plăți, comunicare și restul aplicațiilor tale — mesaje, notificări și sarcini care se generează singure." },
      { titlu: "Integrare sisteme de plată", desc: "Conectăm procesatorul de plăți potrivit pentru ONG-ul tău, cu donații unice și recurente direct pe pagina de campanie." },
      { titlu: "Integrare semnătură digitală", desc: "Contracte de sponsorizare semnate electronic, cu flux de aprobare — fără drumuri și fără hârtii." },
      { titlu: "Platformă de fundraising la comandă", desc: "Un sistem construit special pentru organizația ta: CRM, campanii, rapoarte și automatizări, adaptate exact la modul tău de lucru." },
      { titlu: "Website pentru ONG-ul tău", desc: "O prezență profesionistă, cu formular de donații integrat, gata în 10–15 zile lucrătoare." },
    ],
    automatizariExemple: [
      {
        grup: "Donatori",
        items: [
          "Reactivare donatori inactivi — mesaj automat de reconectare când cineva nu mai donează de câteva luni",
          "Mulțumiri pe praguri — mesaj sau certificat special când un donator trece de un total cumulat",
          "Chitanțe fiscale automate la fiecare donație",
        ],
      },
      {
        grup: "Companii & sponsorizări",
        items: [
          "Alerte expirare contract — notificare automată înainte ca un contract de sponsorizare să expire",
          "Generare automată D177 și documente 20% la final de an, trimise direct către companie",
          "Mutare automată în pipeline pe baza activității recente",
        ],
      },
      {
        grup: "Operațional",
        items: [
          "Notificarea echipei la donații mari sau evenimente importante",
          "Follow-up automat pe donații abandonate, neterminate pe pagina de campanie",
          "Rapoarte lunare sau trimestriale generate și trimise automat către board sau sponsori",
          "Sincronizare automată a donatorilor noi într-o listă de newsletter, segmentată",
        ],
      },
    ],
    bridgeText: "Nu primești doar un site sau o automatizare izolată — primești un sistem construit pentru organizația ta, care centralizează donatorii, companiile, contractele, plățile și comunicarea într-un singur loc, ușor de folosit de întreaga echipă.",
    administreziTitlu: "O singură platformă pentru întreaga activitate de fundraising",
    administreziDesc: "Nu mai trebuie să păstrezi donatorii într-un Excel, companiile într-un alt document, contractele în foldere separate și activitățile echipei în aplicații diferite.",
    administreziIntro: "Cu platforma Fundraising Academy poți administra:",
    administrezi: [
      "Donatorii persoane fizice",
      "Companiile și sponsorii",
      "Campaniile de fundraising",
      "Donațiile și plățile recurente",
      "Contractele de sponsorizare",
      "Documentele pentru 20% și D177",
      "Newsletterele și comunicarea",
      "Sarcinile și programul echipei",
      "Rapoartele oferite sponsorilor",
      "Automatizările din Make.com",
      "Rezultatele și indicatorii organizației",
    ],
    ctaTitlu: "Investește într-un sistem care lucrează pentru organizația ta",
    ctaDesc: "Tehnologia nu înlocuiește relația cu donatorii. Îți oferă timpul și informațiile necesare pentru a construi relații mai bune, pentru a reveni la momentul potrivit și pentru a transforma mai multe contacte în susținători pe termen lung.",
    ctaPrimary: "Solicită o demonstrație",
    ctaSecondary: "Discută cu un specialist",
  },
  en: {
    h1: "Automation, integrations and platforms built for your NGO",
    subtitlu: "From Make.com automations and payment and digital signature integrations, to a full fundraising platform or a new website — we build exactly what your organization needs.",
    servicii: [
      { titlu: "Make.com automation", desc: "Automated flows between your CRM, payments, communication and the rest of your apps — messages, notifications and tasks that generate themselves." },
      { titlu: "Payment system integration", desc: "We connect the right payment processor for your NGO, with one-time and recurring donations directly on the campaign page." },
      { titlu: "Digital signature integration", desc: "Sponsorship contracts signed electronically, with an approval flow — no trips, no paperwork." },
      { titlu: "Custom fundraising platform", desc: "A system built specifically for your organization: CRM, campaigns, reports and automations, tailored exactly to how you work." },
      { titlu: "A website for your NGO", desc: "A professional presence with an integrated donation form, ready in 10–15 business days." },
    ],
    automatizariExemple: [
      {
        grup: "Donors",
        items: [
          "Inactive donor reactivation — automatic reconnection message when someone hasn't donated in a few months",
          "Threshold thank-yous — a special message or certificate when a donor crosses a cumulative total",
          "Automatic tax receipts on every donation",
        ],
      },
      {
        grup: "Companies & sponsorships",
        items: [
          "Contract expiry alerts — automatic notification before a sponsorship contract expires",
          "Automatic generation of D177 and 20%-designation documents at year end, sent directly to the company",
          "Automatic pipeline movement based on recent activity",
        ],
      },
      {
        grup: "Operational",
        items: [
          "Team notification on large donations or important events",
          "Automatic follow-up on abandoned donations, left unfinished on the campaign page",
          "Monthly or quarterly reports generated and sent automatically to the board or sponsors",
          "Automatic sync of new donors into a segmented newsletter list",
        ],
      },
    ],
    bridgeText: "You don't just get a site or an isolated automation — you get a system built for your organization, centralizing donors, companies, contracts, payments and communication in one place, easy for the whole team to use.",
    administreziTitlu: "One platform for your entire fundraising activity",
    administreziDesc: "No more keeping donors in a spreadsheet, companies in another document, contracts in separate folders, and the team's activities across different apps.",
    administreziIntro: "With the Fundraising Academy platform you can manage:",
    administrezi: [
      "Individual donors",
      "Companies and sponsors",
      "Fundraising campaigns",
      "Donations and recurring payments",
      "Sponsorship contracts",
      "20% and D177 documents",
      "Newsletters and communication",
      "The team's tasks and schedule",
      "Reports provided to sponsors",
      "Make.com automations",
      "The organization's results and metrics",
    ],
    ctaTitlu: "Invest in a system that works for your organization",
    ctaDesc: "Technology doesn't replace the relationship with donors. It gives you the time and information you need to build better relationships, follow up at the right moment, and turn more contacts into long-term supporters.",
    ctaPrimary: "Request a demo",
    ctaSecondary: "Talk to a specialist",
  },
} satisfies Record<Locale, unknown>;
