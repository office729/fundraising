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

  // Zona cu cont (organizație autentificată) — aceleași etichete ca în
  // navigarea CRM (src/lib/i18n/dictionaries/dashboard.ts, dict.nav) sau în
  // titlul h1 al paginii, cu sufixul „ — CRM" pentru cele a căror etichetă nu
  // conține deja „CRM", ca să rămână clare și separat de restul site-ului în
  // rapoartele Google Analytics „Pagini și ecrane".
  orgSetari: { ro: "Setări", en: "Settings" },
  orgEchipa: { ro: "Echipă", en: "Team" },
  crmAcasa: { ro: "Tablou de bord — CRM", en: "Dashboard — CRM" },
  crmDonatori: { ro: "CRM persoane fizice", en: "Individuals CRM" },
  crmCompanii: { ro: "CRM Companii", en: "Companies CRM" },
  crmBeneficiari: { ro: "Beneficiari & proiecte — CRM", en: "Beneficiaries & projects — CRM" },
  crmDonatii: { ro: "Donații — CRM", en: "Donations — CRM" },
  crmStrangereFonduri: { ro: "Strângere fonduri — CRM", en: "Fundraising pages — CRM" },
  crmFonduriPlati: { ro: "Fonduri și plăți — CRM", en: "Funds & payments — CRM" },
  crmRfm: { ro: "RFM & segmentare — CRM", en: "RFM & segmentation — CRM" },
  crmPortalBeneficiari: { ro: "Panou beneficiari — CRM", en: "Beneficiary panel — CRM" },
  crmTaskuri: { ro: "Taskuri — CRM", en: "Tasks — CRM" },
  crmComunicare: { ro: "Comunicare — CRM", en: "Communication — CRM" },
  crmInstrumente: { ro: "Instrumente — CRM", en: "Tools — CRM" },
  crmConsultanta: { ro: "Consultanță cu Vlad — CRM", en: "Consultation with Vlad — CRM" },
  crmIntegrari: { ro: "Integrări — CRM", en: "Integrations — CRM" },
  crmPresaGrupuri: { ro: "Presă & grupuri locale — CRM", en: "Press & local groups — CRM" },
  crmFormular230: { ro: "Formularul 230 — CRM", en: "Form 230 — CRM" },
  crmProspectare: { ro: "CRM prospectare companii", en: "Company prospecting CRM" },
  crmVoluntari: { ro: "CRM Voluntari", en: "Volunteers CRM" },
  crmProgramLucru: { ro: "Program de lucru — CRM", en: "Work schedule — CRM" },
} as const;

export type PaginaCuTitlu = keyof typeof TITLURI;

// Ținut aici, nu doar în app/layout.tsx, ca titluAbsolut() (mai jos) să
// producă EXACT același rezultat ca sufixul din template-ul layout-ului rădăcină.
export const SUFIX_TITLU = " — Alexandrit";

export async function titluPagina(pagina: PaginaCuTitlu): Promise<string> {
  const locale = await getLocale();
  return TITLURI[pagina][locale];
}

// Pentru pagini la mai mult de un nivel sub un layout care ȘI EL își setează
// propriul titlu (crm/layout.tsx → crm/<sub>/page.tsx) — un titlu simplu
// (string) definit de un layout întrerupe propagarea `template`-ului
// moștenit din app/layout.tsx pentru copiii LUI, deci un titlu simplu la al
// doilea nivel de sub crm/ ar rămâne fără sufix. `absolute` ocolește complet
// moștenirea de template, deci rezultatul e determinist indiferent de câte
// niveluri de layout există între rădăcină și pagină.
export async function titluAbsolut(pagina: PaginaCuTitlu): Promise<{ title: { absolute: string } }> {
  return { title: { absolute: `${await titluPagina(pagina)}${SUFIX_TITLU}` } };
}
