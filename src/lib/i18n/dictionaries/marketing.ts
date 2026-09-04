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
      { href: "/website-fundraising", label: "Website Fundraising" },
    ],
    header: {
      consulting: "Consiliere 1 la 1",
      login: "Autentificare / Creează cont",
      openMenu: "Deschide meniul",
      closeMenu: "Închide meniul",
    },
    hero: {
      eyebrow: "Marketing și fundraising pentru ONG-uri",
      titlePre: "Ghidăm ",
      titleHighlight: "100 de ONG-uri",
      titlePost: " către cele mai bune practici de fundraising",
      subtitle:
        "Cursuri, consiliere 1 la 1 și instrumente practice de la Vlad Plăcintă, coordonator a peste 28 de milioane de euro strânși pentru cauze umanitare.",
      ctaEnroll: "Înscrie-te la curs",
      ctaHub: "Explorează Hub-ul →",
      stats: [
        { n: "28M€+", l: "strânși pentru cauze umanitare" },
        { n: "100", l: "ONG-uri ghidate" },
        { n: "6", l: "module de curs practic" },
      ],
    },
    hubCallout: {
      badge: "Nou",
      title: "Hub Fundraising — instrumente contra cost",
      desc: "Ghiduri și template-uri descărcabile, calculatoare interactive, comunitate privată și consultanță premium. Individual sau cu abonament Hub Pro.",
      cta: "Intră în Hub →",
    },
    lectii: {
      title: "Ce vei învăța?",
      items: [
        { n: "01", t: "Început în Fundraising", d: "Strategiile fundamentale pentru a planifica și implementa campanii de succes, pas cu pas." },
        { n: "02", t: "AI în Fundraising", d: "Cum transformă inteligența artificială fundraising-ul: automatizare, personalizare, analiza datelor." },
        { n: "03", t: "Avatarul donatorului ideal", d: "Definește clar cine sunt donatorii tăi ideali pentru comunicare și strategii eficiente." },
        { n: "04", t: "Sponsorizări și parteneriate", d: "Dezvoltă parteneriate care sprijină financiar și amplifică impactul cauzei tale." },
        { n: "05", t: "Social media și PR", d: "Crește vizibilitatea, consolidează relațiile și atrage susținători activi." },
        { n: "06", t: "Monitorizare și evaluare", d: "Înțelege ce a funcționat și ce nu, ca să crești de la o campanie la alta." },
      ],
    },
    valori: {
      title: "De ce Fundraising Academy?",
      items: [
        { t: "Expertiză dovedită", d: "Peste 22 de milioane de euro strânși și sute de campanii de succes coordonate de Vlad Plăcintă." },
        { t: "Învățare personalizată 1 la 1", d: "Îndrumare directă, adaptată nevoilor tale, ca să aplici strategiile corecte pentru ONG-ul tău." },
        { t: "Resurse și instrumente profesionale", d: "Ghiduri, template-uri și studii de caz — acum disponibile și în noul Hub Fundraising." },
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
    ctaBand: {
      title: "Crește ONG-ul tău la următorul nivel",
      desc: "Înscrie-te la cursul lui Vlad Plăcintă și află cum poți dezvolta impactul organizației tale. Sau programează o sesiune cu unul dintre experții noștri.",
      cta: "Înscrie-te la curs!",
      footnote:
        "Vlad Plăcintă, președinte al Asociației Salvează o Inimă și fondator al Fundraising Academy, îți oferă acces la expertiza sa de peste 12 ani în fundraising — peste 22 milioane de euro strânși pentru cauze umanitare.",
    },
    footer: {
      tagline: "Marketing și fundraising pentru ONG-uri din România.",
      navTitle: "Navigare",
      nav: [
        { href: "/cine-suntem", label: "Cine suntem?" },
        { href: "/portofoliu", label: "Portofoliu" },
        { href: "/premii", label: "Premii Vlad Plăcintă" },
        { href: "/hub", label: "Hub Fundraising" },
        { href: "/portofoliu-clienti", label: "Portofoliu Clienți" },
        { href: "/", label: "Program Training" },
      ],
      legalTitle: "Legal & contact",
      terms: "Termeni și condiții",
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
      { href: "/website-fundraising", label: "Fundraising Website" },
    ],
    header: {
      consulting: "1-on-1 Consulting",
      login: "Log in / Create account",
      openMenu: "Open menu",
      closeMenu: "Close menu",
    },
    hero: {
      eyebrow: "Marketing and fundraising for NGOs",
      titlePre: "Guiding ",
      titleHighlight: "100 NGOs",
      titlePost: " toward fundraising best practices",
      subtitle:
        "Courses, 1-on-1 consulting and practical tools from Vlad Plăcintă, who has coordinated over €28 million raised for humanitarian causes.",
      ctaEnroll: "Enroll in the course",
      ctaHub: "Explore the Hub →",
      stats: [
        { n: "€28M+", l: "raised for humanitarian causes" },
        { n: "100", l: "NGOs guided" },
        { n: "6", l: "practical course modules" },
      ],
    },
    hubCallout: {
      badge: "New",
      title: "Fundraising Hub — paid tools",
      desc: "Downloadable guides and templates, interactive calculators, a private community and premium consulting. One-off or with a Hub Pro subscription.",
      cta: "Enter the Hub →",
    },
    lectii: {
      title: "What will you learn?",
      items: [
        { n: "01", t: "Getting Started in Fundraising", d: "The core strategies for planning and running successful campaigns, step by step." },
        { n: "02", t: "AI in Fundraising", d: "How artificial intelligence is transforming fundraising: automation, personalization, data analysis." },
        { n: "03", t: "Your ideal donor persona", d: "Define exactly who your ideal donors are for effective communication and strategy." },
        { n: "04", t: "Sponsorships & partnerships", d: "Build partnerships that fund and amplify the impact of your cause." },
        { n: "05", t: "Social media & PR", d: "Grow visibility, strengthen relationships and attract active supporters." },
        { n: "06", t: "Monitoring & evaluation", d: "Understand what worked and what didn't, so each campaign builds on the last." },
      ],
    },
    valori: {
      title: "Why Fundraising Academy?",
      items: [
        { t: "Proven expertise", d: "Over €22 million raised and hundreds of successful campaigns coordinated by Vlad Plăcintă." },
        { t: "Personalized 1-on-1 learning", d: "Direct guidance, tailored to your needs, so you apply the right strategy for your NGO." },
        { t: "Professional resources & tools", d: "Guides, templates and case studies — now also available in the new Fundraising Hub." },
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
    ctaBand: {
      title: "Take your NGO to the next level",
      desc: "Enroll in Vlad Plăcintă's course and discover how to grow your organization's impact. Or schedule a session with one of our experts.",
      cta: "Enroll in the course!",
      footnote:
        "Vlad Plăcintă, president of Asociația Salvează o Inimă and founder of Fundraising Academy, gives you access to over 12 years of fundraising expertise — over €22 million raised for humanitarian causes.",
    },
    footer: {
      tagline: "Marketing and fundraising for NGOs in Romania.",
      navTitle: "Navigation",
      nav: [
        { href: "/cine-suntem", label: "About us" },
        { href: "/portofoliu", label: "Portfolio" },
        { href: "/premii", label: "Vlad Plăcintă Awards" },
        { href: "/hub", label: "Fundraising Hub" },
        { href: "/portofoliu-clienti", label: "Client Portfolio" },
        { href: "/", label: "Training Program" },
      ],
      legalTitle: "Legal & contact",
      terms: "Terms & conditions",
      gdpr: "Privacy policy",
      cookies: "Cookie policy",
      location: "Botoșani, Romania",
    },
  },
} satisfies Record<Locale, unknown>;

export type MarketingDict = (typeof MARKETING_DICT)["ro"];
