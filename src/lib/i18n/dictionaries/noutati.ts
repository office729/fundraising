import type { Locale } from "../config";

// Pagina publică „Noutăți” (/noutati): arhiva a ceea ce am îmbunătățit în Alexandrit. Intrările vin din src/content/inovatii.ts, deci pagina și feedul RSS
// se completează singure la fiecare lot publicat. Intrările rămân în română și în varianta EN.
export const NOUTATI_DICT = {
  ro: {
    breadcrumb: "Noutăți",
    acasa: "Acasă",
    eyebrow: "Ce am inovat",
    h1: "Noutăți în Alexandrit",
    subtitlu: "Tot ce am îmbunătățit în platformă, cu cele mai noi primele. Multe vin din ideile propuse și votate de ONG-uri în Centrul de inovare.",
    contor: (n: number) => (n === 1 ? "1 îmbunătățire în ultimele 30 de zile" : `${n} îmbunătățiri în ultimele 30 de zile`),
    contorZero: "Lista se completează la fiecare îmbunătățire adusă platformei.",
    nou: "Nou",
    cumFolosesti: "Cum o folosești ca să strângi mai mult",
    propusa: "Propusă de ONG-uri",
    ctaTitlu: "Spune-ne ce ar trebui să construim mai departe",
    ctaDesc: "Propune o idee în Centrul de inovare, iar celelalte organizații o votează. Creează un cont gratuit pentru 30 de zile, fără card.",
    ctaPrimar: "Începe proba de 30 de zile, fără card",
    ctaSecundar: "Cum funcționează Centrul de inovare",
    rss: "Abonează-te prin RSS",
    feedTitlu: "Noutăți Alexandrit",
    feedDesc: "Tot ce am îmbunătățit în platforma de fundraising Alexandrit.",
  },
  en: {
    breadcrumb: "What's new",
    acasa: "Home",
    eyebrow: "What we innovated",
    h1: "What's new in Alexandrit",
    subtitlu: "Everything we have improved in the platform, newest first. Many come from ideas suggested and voted on by NGOs in the Innovation Center.",
    contor: (n: number) => (n === 1 ? "1 improvement in the last 30 days" : `${n} improvements in the last 30 days`),
    contorZero: "The list is updated with every improvement to the platform.",
    nou: "New",
    cumFolosesti: "How to use it to raise more",
    propusa: "Suggested by NGOs",
    ctaTitlu: "Tell us what we should build next",
    ctaDesc: "Suggest an idea in the Innovation Center and other organizations vote on it. Create a free account for 30 days, no card.",
    ctaPrimar: "Start the 30-day trial, no card",
    ctaSecundar: "How the Innovation Center works",
    rss: "Subscribe via RSS",
    feedTitlu: "Alexandrit news",
    feedDesc: "Everything we have improved in the Alexandrit fundraising platform.",
  },
} satisfies Record<Locale, unknown>;
