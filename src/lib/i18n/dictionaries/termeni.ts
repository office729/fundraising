import type { Locale } from "../config";

export const TERMENI_DICT = {
  ro: {
    homeLabel: "Acasă",
    eyebrow: "Legal",
    titlu: "Termeni și condiții",
    actualizatLabel: "Ultima actualizare",
    actualizat: "[DE COMPLETAT — data publicării]",
    s1: {
      titlu: "1. Despre acest document",
      text: "Acești Termeni și condiții reglementează utilizarea site-ului fundrasingacademy.ro și a platformei Fundraising Academy (cursuri, consiliere, Hub Fundraising, servicii de implementare Automatizare & Implementare), operate de [DE COMPLETAT — denumirea legală a entității, ex. „Vlad Plăcintă PFA” / „Asociația ...”], cu sediul în [DE COMPLETAT — adresă], CUI/CIF [DE COMPLETAT].",
    },
    s2: {
      titlu: "2. Serviciile oferite",
      text: "Platforma oferă: (a) cursuri și materiale educaționale de fundraising; (b) sesiuni de consiliere 1 la 1; (c) instrumente software prin abonament („Hub Fundraising” — CRM, generator de documente, rapoarte etc.); (d) servicii de automatizare și implementare a unei platforme digitale de fundraising („Automatizare & Implementare”).",
    },
    s3: {
      titlu: "3. Cont și abonament",
      text1Before: "Crearea unui cont presupune furnizarea unei adrese de email valide. Abonamentele Hub Fundraising (START, CREȘTERE, IMPACT) se facturează lunar sau anual, conform prețurilor afișate pe pagina",
      text1After: "la momentul înscrierii. Perioada de probă este de 14 zile, fără a fi necesar un card bancar.",
      text2: "[DE COMPLETAT — politica exactă de reziliere, rambursare și suspendare a contului.]",
    },
    s4: {
      titlu: "4. Plăți",
      text: "[DE COMPLETAT — procesatorul de plăți folosit, moneda de facturare, condițiile de facturare pentru pachetele de automatizare și implementare, taxe aplicabile.]",
    },
    s5: {
      titlu: "5. Proprietate intelectuală",
      text: "Conținutul cursurilor, ghidurile, template-urile și materialele puse la dispoziție rămân proprietatea Fundraising Academy. Utilizatorul primește un drept de folosință personal, neexclusiv, pe durata abonamentului activ.",
    },
    s6: {
      titlu: "6. Limitarea răspunderii",
      text: "[DE COMPLETAT — clauze standard de limitare a răspunderii, aplicabile serviciilor educaționale și software oferite; recomandăm redactare de către un avocat specializat, având în vedere caracterul organizației (ONG-uri) și natura datelor gestionate prin CRM (date cu caracter personal ale donatorilor).]",
    },
    s7: {
      titlu: "7. Contact",
      textBefore: "Pentru întrebări legate de acești termeni:",
    },
  },
  en: {
    homeLabel: "Home",
    eyebrow: "Legal",
    titlu: "Terms and Conditions",
    actualizatLabel: "Last updated",
    actualizat: "[TO COMPLETE — publication date]",
    s1: {
      titlu: "1. About this document",
      text: "These Terms and Conditions govern the use of the fundrasingacademy.ro website and the Fundraising Academy platform (courses, consulting, Fundraising Hub, Automation & Implementation services), operated by [TO COMPLETE — legal entity name, e.g. \"Vlad Plăcintă PFA\" / \"Asociația ...\"], registered at [TO COMPLETE — address], Tax ID [TO COMPLETE].",
    },
    s2: {
      titlu: "2. Services offered",
      text: "The platform offers: (a) fundraising courses and educational materials; (b) 1-on-1 consulting sessions; (c) subscription software tools (\"Fundraising Hub\" — CRM, document generator, reports, etc.); (d) automation and implementation services for a digital fundraising platform (\"Automation & Implementation\").",
    },
    s3: {
      titlu: "3. Account and subscription",
      text1Before: "Creating an account requires a valid email address. Fundraising Hub subscriptions (START, CREȘTERE, IMPACT) are billed monthly or annually, per the prices shown on the",
      text1After: "page at the time of sign-up. The trial period is 14 days, no bank card required.",
      text2: "[TO COMPLETE — the exact cancellation, refund, and account-suspension policy.]",
    },
    s4: {
      titlu: "4. Payments",
      text: "[TO COMPLETE — the payment processor used, billing currency, billing terms for automation and implementation packages, applicable taxes.]",
    },
    s5: {
      titlu: "5. Intellectual property",
      text: "The content of the courses, guides, templates and materials made available remains the property of Fundraising Academy. The user is granted a personal, non-exclusive right of use for the duration of the active subscription.",
    },
    s6: {
      titlu: "6. Limitation of liability",
      text: "[TO COMPLETE — standard liability-limitation clauses applicable to the educational and software services offered; we recommend drafting by a specialized lawyer, given the nature of the organizations served (NGOs) and the type of data managed through the CRM (donors' personal data).]",
    },
    s7: {
      titlu: "7. Contact",
      textBefore: "For questions about these terms:",
    },
  },
} satisfies Record<Locale, unknown>;
