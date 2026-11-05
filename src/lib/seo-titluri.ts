// Titluri pentru rezultatele Google (<title> și Open Graph) ale paginilor publice, cu cuvinte-cheie.
// Numele scurte din lib/page-titles.ts rămân pentru firimiturile (breadcrumbs) din date structurate și pentru rapoartele de analiză.
// Fără importuri: se pot testa direct. Sufixul „ — Alexandrit" se adaugă separat (13 caractere), deci un titlu de până la
// 47 de caractere încape în cele ~60 pe care le afișează Google.

export const LUNGIME_MAXIMA_TITLU = 47;

export const TITLURI_CAUTARE: Record<string, { ro: string; en: string }> = {
  "ce-facem": { ro: "Ce facem: fundraising pentru ONG-uri", en: "What we do: fundraising for NGOs" },
  "cine-suntem": { ro: "Cine suntem: echipa de fundraising", en: "Who we are: the fundraising team" },
  contact: { ro: "Contact: programează o discuție", en: "Contact: book a conversation" },
  portofoliu: { ro: "Portofoliu de campanii de fundraising", en: "Portfolio of fundraising campaigns" },
  "portofoliu-clienti": { ro: "Portofoliu clienți: ONG-uri și companii", en: "Client portfolio: NGOs and companies" },
  premii: { ro: "Premii și distincții în fundraising", en: "Awards and distinctions in fundraising" },
  "vlad-placinta": { ro: "Vlad Plăcintă: consultant de fundraising", en: "Vlad Plăcintă: fundraising consultant" },
  automatizari: { ro: "Automatizări pentru fundraising și Formular 230", en: "Fundraising and Form 230 automations" },
  "cum-functioneaza": { ro: "Cum funcționează: de la cont la prima donație", en: "How it works: from account to first donation" },
  "intrebari-frecvente": { ro: "Întrebări frecvente despre CRM pentru ONG-uri", en: "FAQ about CRM for NGOs" },
  noutati: { ro: "Noutăți: funcții noi pentru fundraising", en: "What's new: fundraising features" },
};
