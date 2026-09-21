import "server-only";

import { getLocale } from "@/lib/i18n/get-locale";

// Titlurile paginilor publice, în limba aleasă de vizitator. Layout-ul rădăcină
// (app/layout.tsx) adaugă sufixul „ — Alexandrit". Fără titluri proprii, toate
// paginile se numeau la fel („Alexandrit"), iar rapoartele Google Analytics
// „Pagini și ecrane" (și rezultatele Google) nu le puteau deosebi între ele.
const TITLURI = {
  acasa: { ro: "Alexandrit: platformă de fundraising pentru ONG-uri", en: "Alexandrit: fundraising platform for NGOs" },
  hub: { ro: "Hub Fundraising: prețuri și consiliere", en: "Fundraising Hub: pricing and advisory" },
  automatizari: { ro: "Automatizări", en: "Automations" },
  blog: { ro: "Blog", en: "Blog" },
  "ce-facem": { ro: "Ce facem", en: "What we do" },
  "cine-suntem": { ro: "Cine suntem", en: "Who we are" },
  contact: { ro: "Contact", en: "Contact" },
  cookies: { ro: "Politica de cookies", en: "Cookie policy" },
  gdpr: { ro: "Politica de confidențialitate (GDPR)", en: "Privacy policy (GDPR)" },
  portofoliu: { ro: "Portofoliu", en: "Portfolio" },
  "portofoliu-clienti": { ro: "Portofoliu clienți", en: "Client portfolio" },
  premii: { ro: "Premii", en: "Awards" },
  "studii-de-caz": { ro: "Studii de caz", en: "Case studies" },
  termeni: { ro: "Termeni și condiții", en: "Terms and conditions" },
  "vlad-placinta": { ro: "Vlad Plăcintă", en: "Vlad Plăcintă" },
  login: { ro: "Autentificare", en: "Sign in" },
  signup: { ro: "Creează cont", en: "Create account" },
  "forgot-password": { ro: "Resetare parolă", en: "Reset password" },
  "reset-password": { ro: "Parolă nouă", en: "New password" },
} as const;

export type PaginaCuTitlu = keyof typeof TITLURI;

export async function titluPagina(pagina: PaginaCuTitlu): Promise<string> {
  const locale = await getLocale();
  return TITLURI[pagina][locale];
}
