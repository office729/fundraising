import "server-only";

import type { Metadata } from "next";

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
  dpa: { ro: "Acord de prelucrare a datelor (DPA)", en: "Data Processing Agreement (DPA)" },
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
  // Fără numele donatorului: titlurile ajung în istoricul browserului și în rapoartele de analiză.
  crmDonatorProfil: { ro: "Donator — CRM", en: "Donor — CRM" },
  crmCompanii: { ro: "CRM Companii", en: "Companies CRM" },
  crmBeneficiari: { ro: "Beneficiari & proiecte — CRM", en: "Beneficiaries & projects — CRM" },
  crmDonatii: { ro: "Donații — CRM", en: "Donations — CRM" },
  crmStrangereFonduri: { ro: "Strângere fonduri — CRM", en: "Fundraising pages — CRM" },
  crmFonduriPlati: { ro: "Fonduri și plăți — CRM", en: "Funds & payments — CRM" },
  crmRfm: { ro: "Segmente de donatori (RFM) — CRM", en: "Donor segments (RFM) — CRM" },
  crmPortalBeneficiari: { ro: "Panou beneficiari — CRM", en: "Beneficiary panel — CRM" },
  crmTaskuri: { ro: "Taskuri — CRM", en: "Tasks — CRM" },
  crmComunicare: { ro: "Comunicare — CRM", en: "Communication — CRM" },
  crmInstrumente: { ro: "Instrumente — CRM", en: "Tools — CRM" },
  crmConsultanta: { ro: "Consultanță cu Vlad — CRM", en: "Consultation with Vlad — CRM" },
  crmIntegrari: { ro: "Setări — CRM", en: "Settings — CRM" },
  crmPresaGrupuri: { ro: "Presă & grupuri locale — CRM", en: "Press & local groups — CRM" },
  crmFormular230: { ro: "Formularul 230 — CRM", en: "Form 230 — CRM" },
  crmAvatarDonator: { ro: "Avatar donator — CRM", en: "Donor avatar — CRM" },
  crmKpiLibrary: { ro: "KPI Library — CRM", en: "KPI Library — CRM" },
  crmKpiEchipa: { ro: "KPI echipă — CRM", en: "Team KPIs — CRM" },
  crmKpiDashboard: { ro: "KPI-urile mele — CRM", en: "My KPIs — CRM" },
  crmKpiAtribuiri: { ro: "Atribuiri KPI — CRM", en: "KPI assignments — CRM" },
  crmKpiDepartament: { ro: "KPI departament — CRM", en: "Department KPIs — CRM" },
  crmKpiManager: { ro: "KPI echipa mea — CRM", en: "My team's KPIs — CRM" },
  crmKpiFunnel: { ro: "Funnel-uri — CRM", en: "Funnels — CRM" },
  crmD177: { ro: "Companii D177 — CRM", en: "D177 companies — CRM" },
  crmKpiStart: { ro: "Configurare KPI — CRM", en: "KPI setup — CRM" },
  crmKpiPermisiuni: { ro: "Permisiuni KPI — CRM", en: "KPI permissions — CRM" },
  crmKpiRapoarte: { ro: "Rapoarte KPI — CRM", en: "KPI reports — CRM" },
  crmKpiJurnal: { ro: "Jurnal modificări KPI — CRM", en: "KPI change log — CRM" },
  crmKpiRitm: { ro: "Check-in și 1:1 — CRM", en: "Check-ins and 1:1s — CRM" },
  crmKpiSezoniere: { ro: "Profiluri KPI sezoniere — CRM", en: "Seasonal KPI profiles — CRM" },
  crmKpiOrganizatie: { ro: "Dashboard organizație — CRM", en: "Organization dashboard — CRM" },
  crmOrganizatie: { ro: "Organizație & Echipă — CRM", en: "Organization & Team — CRM" },
  crmProspectare: { ro: "CRM prospectare companii", en: "Company prospecting CRM" },
  crmComunicate: { ro: "Comunicate de presă — CRM", en: "Press releases — CRM" },
  crmGrupuriFacebook: { ro: "Împărțire grupuri Facebook — CRM", en: "Facebook groups split — CRM" },
  crmPj: { ro: "CRM persoane juridice", en: "Company CRM" },
  crmDonatoriImporturi: { ro: "Importuri donații — CRM", en: "Donation imports — CRM" },
  crmDonatoriProiecte: { ro: "Proiecte — CRM persoane fizice", en: "Projects — individual donors CRM" },
  crmDonatoriAcasa: { ro: "Acasă — CRM persoane fizice", en: "Home — individual donors CRM" },
  crmDonatoriRapoarte: { ro: "Rapoarte — CRM persoane fizice", en: "Reports — individual donors CRM" },
  crmDonatoriAnalize: { ro: "Analize donatori — CRM", en: "Donor analytics — CRM" },
  crmVoluntariPanou: { ro: "Panoul voluntarilor — CRM", en: "Volunteer panel — CRM" },
  crmVoluntari: { ro: "CRM Voluntari", en: "Volunteers CRM" },
  crmPerformanta: { ro: "Echipă & Performanță — CRM", en: "Team & Performance — CRM" },
  crmPerformantaObiective: { ro: "Obiective și rezultate — CRM", en: "Objectives and results — CRM" },
  crmProgramLucru: { ro: "Program de lucru — CRM", en: "Work schedule — CRM" },
  crmNewsletterPf: { ro: "Newsletter persoane fizice — CRM", en: "Individuals newsletter — CRM" },
  crmNewsletterPj: { ro: "Newsletter persoane juridice — CRM", en: "Companies newsletter — CRM" },
  crmOnePager: { ro: "Generator one-pager — CRM", en: "One-pager generator — CRM" },
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

// Metadate complete pentru paginile publice: descriere PROPRIE (înainte toate aveau aceeași, de 53 de caractere),
// canonical, Open Graph / Twitter, iar paginile fără conținut real sau cu rol tehnic (autentificare, „în curând")
// sunt marcate noindex.
const DESCRIERI: Partial<Record<PaginaCuTitlu, { ro: string; en: string }>> = {
  acasa: {
    ro: "Alexandrit organizează donatorii, companiile sponsor și campaniile ONG-ului tău: CRM, pagini de donații, Formular 230 și instrumente de fundraising într-un singur loc.",
    en: "Alexandrit keeps your NGO's donors, corporate sponsors and campaigns in one place: CRM, donation pages, Form 230 and fundraising tools.",
  },
  hub: {
    ro: "Alege pachetul Alexandrit potrivit ONG-ului tău: prețuri clare, 30 de zile de probă gratuită și consiliere de fundraising 1 la 1.",
    en: "Choose the Alexandrit plan that fits your NGO: clear pricing, a 30-day free trial and 1-to-1 fundraising advice.",
  },
  automatizari: {
    ro: "Automatizări pentru fundraising: mesaje de mulțumire, reamintiri pentru Formularul 230 și fluxuri care economisesc timp echipei ONG-ului tău.",
    en: "Fundraising automations: thank-you messages, Form 230 reminders and workflows that save your NGO team time.",
  },
  "ce-facem": {
    ro: "Ce facem la Alexandrit: platformă de fundraising, consiliere și instrumente pentru ONG-uri care vor să strângă mai mulți bani, mai organizat.",
    en: "What Alexandrit does: a fundraising platform, advice and tools for NGOs that want to raise more, in a more organized way.",
  },
  "cine-suntem": {
    ro: "Cine suntem: echipa din spatele Alexandrit și experiența noastră în fundraising pentru ONG-uri din România.",
    en: "Who we are: the team behind Alexandrit and our experience in fundraising for NGOs in Romania.",
  },
  contact: {
    ro: "Contactează echipa Alexandrit: întrebări despre platformă, prețuri sau consiliere de fundraising pentru ONG-ul tău.",
    en: "Contact the Alexandrit team: questions about the platform, pricing or fundraising advice for your NGO.",
  },
  cookies: {
    ro: "Politica de cookies Alexandrit: ce cookie-uri folosim, în ce scop și cum îți poți retrage oricând acordul pentru statistici.",
    en: "Alexandrit cookie policy: which cookies we use, why, and how to withdraw your consent for analytics at any time.",
  },
  gdpr: {
    ro: "Politica de confidențialitate (GDPR) Alexandrit: ce date prelucrăm, de ce, cât timp le păstrăm și ce drepturi ai.",
    en: "Alexandrit privacy policy (GDPR): what data we process, why, how long we keep it and what rights you have.",
  },
  dpa: {
    ro: "Acordul de prelucrare a datelor (DPA) dintre Alexandrit și organizațiile care folosesc platforma, conform art. 28 GDPR.",
    en: "The Data Processing Agreement (DPA) between Alexandrit and the organizations using the platform, under Art. 28 GDPR.",
  },
  portofoliu: {
    ro: "Portofoliul Alexandrit: campanii, proiecte și rezultate obținute împreună cu ONG-uri din România.",
    en: "The Alexandrit portfolio: campaigns, projects and results achieved together with NGOs in Romania.",
  },
  "portofoliu-clienti": {
    ro: "Clienții Alexandrit: organizații și companii cu care am lucrat la campanii de fundraising și sponsorizări.",
    en: "Alexandrit clients: organizations and companies we have worked with on fundraising and sponsorship campaigns.",
  },
  premii: {
    ro: "Premiile și recunoașterile primite pentru proiectele de fundraising și comunicare ale echipei Alexandrit.",
    en: "Awards and recognition received for the Alexandrit team's fundraising and communication projects.",
  },
  termeni: {
    ro: "Termenii și condițiile de utilizare a platformei Alexandrit: abonamente, plăți, responsabilități și încetarea contractului.",
    en: "Terms and conditions for using the Alexandrit platform: subscriptions, payments, responsibilities and termination.",
  },
  "vlad-placinta": {
    ro: "Vlad Plăcintă: consiliere de fundraising pentru ONG-uri, prin platforma Alexandrit.",
    en: "Vlad Plăcintă: fundraising advice for NGOs, through the Alexandrit platform.",
  },
};

const CALE_CANONICA: Partial<Record<PaginaCuTitlu, string>> = {
  acasa: "/",
  hub: "/hub",
  automatizari: "/automatizari",
  "ce-facem": "/ce-facem",
  "cine-suntem": "/cine-suntem",
  contact: "/contact",
  cookies: "/cookies",
  gdpr: "/gdpr",
  dpa: "/dpa",
  portofoliu: "/portofoliu",
  "portofoliu-clienti": "/portofoliu-clienti",
  premii: "/premii",
  termeni: "/termeni",
  "vlad-placinta": "/vlad-placinta",
};

const FARA_INDEXARE: ReadonlySet<PaginaCuTitlu> = new Set<PaginaCuTitlu>(["login", "signup", "forgot-password", "reset-password", "blog", "studii-de-caz"]);

export async function metadatePagina(pagina: PaginaCuTitlu): Promise<Metadata> {
  const locale = await getLocale();
  const titlu = TITLURI[pagina][locale];
  const descriere = DESCRIERI[pagina]?.[locale];
  const cale = CALE_CANONICA[pagina];
  const titluComplet = pagina === "acasa" ? titlu : `${titlu}${SUFIX_TITLU}`;
  return {
    title: pagina === "acasa" ? { absolute: titlu } : titlu,
    ...(descriere ? { description: descriere } : {}),
    ...(cale ? { alternates: { canonical: cale } } : {}),
    ...(FARA_INDEXARE.has(pagina) ? { robots: { index: false, follow: true } } : {}),
    ...(descriere && cale
      ? {
          openGraph: { title: titluComplet, description: descriere, url: cale, type: "website" as const, siteName: "Alexandrit", locale: locale === "ro" ? "ro_RO" : "en_US" },
          twitter: { card: "summary" as const, title: titluComplet, description: descriere },
        }
      : {}),
  };
}
