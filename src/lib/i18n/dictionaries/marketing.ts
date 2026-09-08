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
      { href: "/automatizare", label: "Automatizare" },
    ],
    header: {
      consulting: "Consiliere 1 la 1",
      login: "Autentificare / Creează cont",
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
        { n: "14 zile", l: "trial gratuit, fără card" },
      ],
    },
    platforma: {
      title: "Tot ce are nevoie ONG-ul tău, într-un singur loc",
      items: [
        { n: "01", t: "CRM Donatori", d: "Toți donatorii persoane fizice, cu istoric complet de donații, segmentare și notițe — populat automat din paginile de colectare." },
        { n: "02", t: "CRM Companii & Sponsorizări", d: "Urmărești firmele partenere de la primul contact până la contract semnat și sponsorizare încasată." },
        { n: "03", t: "Pagini de donație online", d: "Creezi o pagină de colectare pentru fiecare caz, accepți donații cu cardul, iar donatorul primește automat mesaj și email de mulțumire." },
        { n: "04", t: "Instrumente de lucru", d: "Newsletter, rapoarte de activitate, one-pager pentru companii, program de lucru al echipei — generate din datele tale reale." },
        { n: "05", t: "Rapoarte & GDPR", d: "Consimțăminte GDPR colectate corect la fiecare donație, rapoarte gata de printat pentru consiliul director sau sponsori." },
        { n: "06", t: "Acces pe roluri, pentru toată echipa", d: "Fiecare coleg are cont propriu, cu acces controlat — de la voluntari la coordonator." },
      ],
    },
    valori: {
      title: "De ce Fundraising Academy?",
      items: [
        { t: "Construită pe o fundație solidă, care a strâns 28M€", d: "Fiecare instrument pornește din nevoi reale, testate în activitatea Asociației Salvează o Inimă, nu din presupuneri." },
        { t: "Toate instrumentele, într-un singur abonament", d: "CRM, pagini de donație, rapoarte și newslettere — nu plătești separat pentru fiecare unealtă, doar pentru capacitate." },
        { t: "Trial complet, 14 zile, fără card", d: "Testezi platforma cu datele tale reale înainte să te decizi — fără angajament, fără card bancar." },
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
    footer: {
      tagline: "Platforma CRM pentru ONG-uri din România.",
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
      { href: "/automatizare", label: "Automation" },
    ],
    header: {
      consulting: "1-on-1 Consulting",
      login: "Log in / Create account",
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
        { n: "14 days", l: "free trial, no card" },
      ],
    },
    platforma: {
      title: "Everything your NGO needs, in one place",
      items: [
        { n: "01", t: "Donor CRM", d: "Every individual donor, with full donation history, segmentation and notes — populated automatically from your donation pages." },
        { n: "02", t: "Company CRM & sponsorships", d: "Track partner companies from first contact through signed contract and received sponsorship." },
        { n: "03", t: "Online donation pages", d: "Create a donation page for each case, accept card payments, and the donor automatically gets a thank-you message and email." },
        { n: "04", t: "Working tools", d: "Newsletters, activity reports, company one-pagers, team work schedules — generated from your real data." },
        { n: "05", t: "Reports & GDPR", d: "GDPR consent collected correctly on every donation, print-ready reports for your board or sponsors." },
        { n: "06", t: "Role-based access for the whole team", d: "Every teammate gets their own account, with controlled access — from volunteers to the coordinator." },
      ],
    },
    valori: {
      title: "Why Fundraising Academy?",
      items: [
        { t: "Built on a solid foundation that raised €28M", d: "Every tool starts from a real need, tested in Asociația Salvează o Inimă's own work — not from guesswork." },
        { t: "Every tool, in one subscription", d: "CRM, donation pages, reports and newsletters — you don't pay separately per tool, only for capacity." },
        { t: "Full 14-day trial, no card", d: "Test the platform with your real data before you decide — no commitment, no bank card." },
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
    footer: {
      tagline: "The CRM platform for NGOs in Romania.",
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
