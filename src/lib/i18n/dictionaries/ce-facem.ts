import type { Locale } from "../config";

export const CE_FACEM_DICT = {
  ro: {
    breadcrumb: "Ce facem?",
    eyebrow: "Ce facem?",
    titlu: "Patru moduri de a lucra cu Fundraising Academy",
    subtitlu: "De la un curs structurat, la instrumente pe care le folosești zilnic — alegi ce se potrivește etapei în care se află organizația ta.",
    servicii: [
      {
        titlu: "Cursuri de fundraising",
        desc: "Fundraising în 10 ședințe, structurat pas cu pas: de la strategie și avatarul donatorului ideal, până la sponsorizări, social media și monitorizarea rezultatelor.",
        ctaLabel: "Vezi ce vei învăța",
        ctaHref: "/#ce-vei-invata",
      },
      {
        titlu: "Consiliere 1 la 1",
        desc: "Sesiuni individuale, online, direct cu Vlad Plăcintă — audit al campaniilor actuale și plan de acțiune concret, primit în scris.",
        ctaLabel: "Programează o sesiune",
        ctaHref: "/hub#consultanta",
      },
      {
        titlu: "Hub Fundraising",
        desc: "Instrumente contra cost pentru activitatea de zi cu zi: CRM pentru persoane fizice și juridice, generator de documente pentru 20% și D177, rapoarte, newsletter.",
        ctaLabel: "Vezi abonamentele",
        ctaHref: "/hub",
      },
      {
        titlu: "Automatizare & Implementare",
        desc: "Automatizări Make.com, integrarea sistemelor de plată și semnătură digitală, sau construirea unei platforme de fundraising ori a unui website nou, la comandă.",
        ctaLabel: "Vezi pachetele de implementare",
        ctaHref: "/automatizare",
      },
    ],
  },
  en: {
    breadcrumb: "What we do?",
    eyebrow: "What we do?",
    titlu: "Four ways to work with Fundraising Academy",
    subtitlu: "From a structured course to tools you use daily — pick what fits the stage your organization is at.",
    servicii: [
      {
        titlu: "Fundraising courses",
        desc: "Fundraising in 10 sessions, structured step by step: from strategy and the ideal donor persona, to sponsorships, social media and monitoring results.",
        ctaLabel: "See what you'll learn",
        ctaHref: "/#ce-vei-invata",
      },
      {
        titlu: "1-on-1 consulting",
        desc: "Individual, online sessions directly with Vlad Plăcintă — an audit of your current campaigns and a concrete action plan, delivered in writing.",
        ctaLabel: "Book a session",
        ctaHref: "/hub#consultanta",
      },
      {
        titlu: "Fundraising Hub",
        desc: "Paid tools for day-to-day work: CRM for individuals and companies, document generator for the 20% designation and D177, reports, newsletter.",
        ctaLabel: "See the subscriptions",
        ctaHref: "/hub",
      },
      {
        titlu: "Automation & Implementation",
        desc: "Make.com automations, payment and digital signature integrations, or building a custom fundraising platform or a new website.",
        ctaLabel: "See the implementation packages",
        ctaHref: "/automatizare",
      },
    ],
  },
} satisfies Record<Locale, unknown>;
