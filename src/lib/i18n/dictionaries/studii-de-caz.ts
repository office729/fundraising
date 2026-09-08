import type { Locale } from "../config";

export const STUDII_DE_CAZ_DICT = {
  ro: {
    breadcrumb: "Studii de Caz",
    eyebrow: "Studii de caz",
    titlu: "Cum arată rezultatele, în practică",
    caz: {
      eyebrow: "Asociația Salvează o Inimă",
      titlu: "De la înființare la peste 22 de milioane de euro strânși",
      stats: [
        { v: "28M €", l: "strânși" },
        { v: "690+", l: "campanii" },
        { v: "1000+", l: "beneficiari" },
        { v: "14 ani", l: "de activitate" },
      ],
      provocare: {
        titlu: "Provocarea",
        desc: "O organizație tânără, fără sistem structurat de fundraising, care avea nevoie să construiască de la zero relația cu donatorii persoane fizice și cu firmele partenere.",
      },
      abordare: {
        titlu: "Abordarea",
        desc: "Vlad Plăcintă, președintele asociației, a construit sistemul de fundraising, comunicarea cu donatorii și relația cu companiile sponsor — aceleași principii predate azi în cadrul cursurilor și consilierii 1 la 1 din Fundraising Academy, și susținute acum de instrumentele din Hub Fundraising (CRM persoane fizice/juridice, documente de sponsorizare 20% și D177).",
      },
      rezultat: {
        titlu: "Rezultatul",
        desc: "Peste 22 de milioane de euro strânși în peste 14 ani de activitate, prin peste 690 de campanii umanitare care au ajuns la peste 1.000 de beneficiari.",
      },
      cta: "Discută despre situația ONG-ului tău",
    },
    footnotePre: "Mai multe studii de caz — pentru Asociația HAPPY, Asociația Nectarios, A.P.C.A Botoșani și Asociația ANAID — vor fi adăugate aici pe măsură ce sunt documentate.",
    footnoteCta: "Vezi portofoliul complet →",
  },
  en: {
    breadcrumb: "Case Studies",
    eyebrow: "Case studies",
    titlu: "What results look like, in practice",
    caz: {
      eyebrow: "Asociația Salvează o Inimă",
      titlu: "From founding to over €22 million raised",
      stats: [
        { v: "€28M", l: "raised" },
        { v: "690+", l: "campaigns" },
        { v: "1000+", l: "beneficiaries" },
        { v: "14 yrs", l: "of activity" },
      ],
      provocare: {
        titlu: "The challenge",
        desc: "A young organization, with no structured fundraising system, that needed to build its relationship with individual donors and partner companies from scratch.",
      },
      abordare: {
        titlu: "The approach",
        desc: "Vlad Plăcintă, the association's president, built the fundraising system, donor communication and the relationship with sponsor companies — the same principles taught today in Fundraising Academy's courses and 1-on-1 consulting, and now backed by the Fundraising Hub tools (individual/company CRM, 20% sponsorship and D177 documents).",
      },
      rezultat: {
        titlu: "The result",
        desc: "Over €22 million raised across more than 14 years of activity, through 690+ humanitarian campaigns that reached over 1,000 beneficiaries.",
      },
      cta: "Discuss your NGO's situation",
    },
    footnotePre: "More case studies — for Asociația HAPPY, Asociația Nectarios, A.P.C.A Botoșani and Asociația ANAID — will be added here as they get documented.",
    footnoteCta: "See the full portfolio →",
  },
} satisfies Record<Locale, unknown>;
