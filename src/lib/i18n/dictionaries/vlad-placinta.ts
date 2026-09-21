import type { Locale } from "../config";

// Doar informații deja publicate în restul site-ului (Cine suntem, Premii). Fără date noi.
export const VLAD_PLACINTA_DICT = {
  ro: {
    homeLabel: "Acasă",
    cineSuntem: "Cine suntem?",
    breadcrumb: "Vlad Plăcintă",
    eyebrow: "Fondatorul Alexandrit",
    titlu: "Vlad Plăcintă",
    subtitlu: "Președintele Asociației „Salvează o Inimă” și fondatorul Alexandrit",
    paragrafe: [
      "Sunt Vlad Plăcintă, președintele Asociației „Salvează o Inimă” și fondatorul Alexandrit. De peste 14 ani mă dedic sprijinirii cauzelor umanitare și dezvoltării strategiilor de fundraising pentru ONG-uri.",
      "Prin campaniile pe care le-am coordonat am reușit să strâng peste 28 de milioane de euro, bani care au salvat sute de vieți. Din această experiență a apărut Alexandrit: metode testate, instrumente practice și îndrumare personalizată pentru organizațiile care vor să strângă mai multe fonduri, să aibă donatori fideli și parteneriate durabile.",
      "Activitatea mea a fost recunoscută prin numeroase premii, între care titlul de „Omul Anului 2023”, acordat pentru 12 ani de activitate neîntreruptă în sprijinul celor mai vulnerabili.",
    ],
    cifre: [
      { v: "14+ ani", l: "de experiență în fundraising" },
      { v: "28 mil. €", l: "strânși prin campanii" },
      { v: "700+", l: "campanii reușite" },
      { v: "1 la 1", l: "mentorat direct" },
    ],
    lucruTitlu: "Cum lucrezi cu mine",
    lucru: [
      { titlu: "Consiliere 1 la 1", desc: "Sesiuni personalizate în care analizăm campaniile organizației tale și stabilim pașii următori." },
      { titlu: "Instrumentele platformei", desc: "Te învăț să lucrezi pe CRM, newsletter, one-pager și program de lucru — sau le adaptăm împreună nevoilor echipei tale." },
      { titlu: "Cursuri structurate", desc: "Fundraising în 10 ședințe, cu suport practic și resurse aplicabile imediat." },
    ],
    premiiTitlu: "Premii și distincții",
    premiiDesc: "Omul Anului 2023, Cetățean de onoare al Municipiului Botoșani, Crucea Moldavă, Crucea Bucovinei și altele.",
    premiiCta: "Vezi toate distincțiile →",
    bandaTitlu: "Învață direct de la mine, 1 la 1, cum să creezi campanii de succes pentru ONG-ul tău",
    bandaCta: "Programează-te gratuit",
  },
  en: {
    homeLabel: "Home",
    cineSuntem: "About us",
    breadcrumb: "Vlad Plăcintă",
    eyebrow: "Founder of Alexandrit",
    titlu: "Vlad Plăcintă",
    subtitlu: "President of Asociația „Salvează o Inimă” and founder of Alexandrit",
    paragrafe: [
      "I am Vlad Plăcintă, president of Asociația „Salvează o Inimă” and founder of Alexandrit. For over 14 years I have dedicated myself to supporting humanitarian causes and building fundraising strategies for NGOs.",
      "Through the campaigns I have led, I have raised over €28 million, money that saved hundreds of lives. Alexandrit grew out of that experience: tested methods, practical tools and personal guidance for organisations that want to raise more, keep loyal donors and build lasting partnerships.",
      "My work has been recognised with numerous awards, including „Man of the Year 2023”, given for 12 years of uninterrupted work supporting the most vulnerable.",
    ],
    cifre: [
      { v: "14+ years", l: "of fundraising experience" },
      { v: "€28M", l: "raised through campaigns" },
      { v: "700+", l: "successful campaigns" },
      { v: "1-on-1", l: "direct mentoring" },
    ],
    lucruTitlu: "How we can work together",
    lucru: [
      { titlu: "1-on-1 consulting", desc: "Personal sessions where we review your organisation's campaigns and set the next steps." },
      { titlu: "The platform's tools", desc: "I teach you to work with the CRM, newsletter, one-pager and work schedule — or we adapt them together to your team's needs." },
      { titlu: "Structured courses", desc: "Fundraising in 10 sessions, with practical support and resources you can apply right away." },
    ],
    premiiTitlu: "Awards and honors",
    premiiDesc: "Man of the Year 2023, Honorary Citizen of Botoșani, the Moldavian Cross, the Cross of Bukovina and more.",
    premiiCta: "See all honors →",
    bandaTitlu: "Learn directly from me, 1-on-1, how to build successful campaigns for your NGO",
    bandaCta: "Book a free session",
  },
} satisfies Record<Locale, unknown>;
