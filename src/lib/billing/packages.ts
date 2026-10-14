// Sursă de adevăr: pagina de prețuri "Hub Fundraising" (Alexandrit).
// Toate pachetele plătite includ TOATE instrumentele — diferența dintre
// START / CREȘTERE / IMPACT e prin COTE (utilizatori, contacte, generări
// lunare), nu prin acces la instrumente. "trial" (14 zile, fără card) are
// cote generoase, nivel IMPACT, ca ONG-ul să poată evalua platforma complet.
//
// Aplicarea efectivă a cotelor (blocare la depășire, contorizare lunară
// pentru rapoarte/contracte/D177) e Faza 1/2 — aici e doar structura de date.

export type OrgPackage = "trial" | "start" | "crestere" | "impact" | "custom";

export type ToolId =
  | "one-pager"
  | "one-pager-generator"
  | "raport-companii"
  | "newsletter-pf"
  | "newsletter-pj"
  | "crm"
  | "crm-pj"
  | "contract-sponsorizare"
  | "crm-pf"
  | "program-lucru";

// Module incluse începând cu un anumit pachet (pe lângă cotele din PACKAGE_LIMITS). Ce nu e listat aici (CRM-ul de bază, campaniile,
// Formularul 230, contractele, newsletterul, rapoartele) e în toate pachetele. Probă și plan personalizat: toate deschise.
export type ModulPachet = "program-lucru" | "kpi" | "instrumente-design" | "voluntari" | "comunicat-presa" | "analiza-baze" | "granturi" | "calendar";

export const MODULE_PACHET: Record<ModulPachet, { minim: "crestere" | "impact"; nume: string }> = {
  "program-lucru": { minim: "crestere", nume: "Program de lucru" },
  kpi: { minim: "crestere", nume: "KPI și performanță" },
  "instrumente-design": { minim: "crestere", nume: "Instrumente de design" },
  voluntari: { minim: "crestere", nume: "CRM voluntari" },
  "comunicat-presa": { minim: "impact", nume: "Comunicat de presă" },
  "analiza-baze": { minim: "impact", nume: "Analiza bazei de date" },
  granturi: { minim: "impact", nume: "Granturi" },
  calendar: { minim: "impact", nume: "Calendar de fundraising" },
};

const RANG_PACHET: Record<string, number> = { start: 1, crestere: 2, impact: 3 };

// Pachetul are modulul? Proba (nivel IMPACT) și planul personalizat le au pe toate.
export function areModul(pkg: OrgPackage, modul: ModulPachet): boolean {
  if (pkg === "trial" || pkg === "custom") return true;
  return (RANG_PACHET[pkg] ?? 0) >= RANG_PACHET[MODULE_PACHET[modul].minim];
}

// Toate instrumentele sunt disponibile în orice pachet — inclusiv trial.
export const ALL_TOOLS: ToolId[] = [
  "one-pager",
  "one-pager-generator",
  "raport-companii",
  "newsletter-pf",
  "newsletter-pj",
  "crm",
  "crm-pj",
  "contract-sponsorizare",
  "crm-pf",
  "program-lucru",
];

// Pachetele fixe (trial/start/crestere/impact) includ TOATE instrumentele —
// intenționat, per comentariul de mai sus. DOAR planul personalizat
// diferențiază pe instrument (7 lei/instrument bifat în constructorul de
// plan, vezi custom-plan-builder.tsx) — înainte, funcția asta returna mereu
// `true` necondiționat și nu era apelată nicăieri, deci un client care alegea
// 0 instrumente la planul personalizat avea acces identic cu unul care le
// bifa pe toate.
export function orgHasToolAccess(
  pkg: OrgPackage,
  customPlanConfig: { tools: ToolId[] } | null,
  tool: ToolId,
): boolean {
  if (pkg !== "custom") return true;
  return (customPlanConfig?.tools ?? []).includes(tool);
}

// `null` = nelimitat.
export type PackageLimits = {
  pretLunar: number | null; // lei; null pentru trial (nu se plătește)
  utilizatori: number | null;
  contactePf: number | null;
  companiiPj: number | null;
  onePagerActive: number | null;
  rapoarteCompaniiPeLuna: number | null;
  contracteSponsorizarePeLuna: number | null;
  documenteD177PeLuna: number | null;
  newsletterBiblioteca: "standard" | "completa" | "completa-personalizabila";
  programLucru: "individual" | "echipa" | "echipa-cu-roluri";
  // Cote pe ce aduce organizația: câte campanii pot fi active în același timp și câte conturi de Formular 230 (beneficiari) are.
  // Se aplică la creare / redeschidere; ce există deja nu se închide singur.
  campaniiActive: number | null;
  conturi230: number | null;
  // Activități pe teren la Voluntari (tură, cod QR, remindere, adeverință). Sarcinile online și pagina publică rămân în toate pachetele.
  voluntariActivitati: boolean;
  // Avatar donator complet (fișa ta, buget, sinteză, chestionar, profiluri). Avatarele din date sunt în toate pachetele.
  avatarComplet: boolean;
  // Domeniu propriu al organizației (ex. susinima.ro).
  domeniuPropriu: boolean;
};

// "custom" nu are cote fixe — vezi organizations.custom_plan_config și
// lib/billing/custom-plan.ts.
export const PACKAGE_LIMITS: Record<Exclude<OrgPackage, "custom">, PackageLimits> = {
  trial: {
    pretLunar: null,
    utilizatori: 10,
    contactePf: 50_000,
    companiiPj: 10_000,
    onePagerActive: null,
    rapoarteCompaniiPeLuna: null,
    contracteSponsorizarePeLuna: null,
    documenteD177PeLuna: null,
    newsletterBiblioteca: "completa-personalizabila",
    programLucru: "echipa-cu-roluri",
    campaniiActive: null,
    conturi230: null,
    voluntariActivitati: true,
    avatarComplet: true,
    domeniuPropriu: true,
  },
  start: {
    pretLunar: 49,
    utilizatori: 1,
    contactePf: 1_000,
    companiiPj: 150,
    onePagerActive: 1,
    rapoarteCompaniiPeLuna: 3,
    contracteSponsorizarePeLuna: null,
    documenteD177PeLuna: null,
    newsletterBiblioteca: "standard",
    programLucru: "individual",
    campaniiActive: null,
    conturi230: null,
    voluntariActivitati: false,
    avatarComplet: false,
    domeniuPropriu: false,
  },
  crestere: {
    pretLunar: 149,
    utilizatori: 3,
    contactePf: 10_000,
    companiiPj: 700,
    onePagerActive: 5,
    rapoarteCompaniiPeLuna: 15,
    contracteSponsorizarePeLuna: null,
    documenteD177PeLuna: null,
    newsletterBiblioteca: "completa",
    programLucru: "echipa",
    campaniiActive: null,
    conturi230: null,
    voluntariActivitati: true,
    avatarComplet: true,
    domeniuPropriu: false,
  },
  impact: {
    pretLunar: 299,
    utilizatori: 10,
    contactePf: 50_000,
    companiiPj: 10_000,
    onePagerActive: null,
    rapoarteCompaniiPeLuna: null,
    contracteSponsorizarePeLuna: null,
    documenteD177PeLuna: null,
    newsletterBiblioteca: "completa-personalizabila",
    programLucru: "echipa-cu-roluri",
    campaniiActive: null,
    conturi230: null,
    voluntariActivitati: true,
    avatarComplet: true,
    domeniuPropriu: true,
  },
};

// Utilizatori suplimentari, doar peste pachetul START (1 utilizator inclus): 15 lei/lună fiecare, până la 4 în plus (5 în total).
// Peste asta, CREȘTERE (3 utilizatori + cote mult mai mari) e alegerea potrivită. Prețul se calculează mereu server-side.
export const PRET_UTILIZATOR_SUPLIMENTAR = 15;
export const MAX_UTILIZATORI_SUPLIMENTARI = 4;

// Aduce numărul cerut la un întreg valid; pentru alte pachete decât START nu există utilizatori suplimentari.
export function utilizatoriSuplimentariValizi(pkg: OrgPackage, cerut: unknown): number {
  if (pkg !== "start") return 0;
  const n = Math.round(Number(cerut));
  return Number.isFinite(n) ? Math.min(MAX_UTILIZATORI_SUPLIMENTARI, Math.max(0, n)) : 0;
}

// Eticheta pachetului pe comandă, pe factură și în emailuri, cu utilizatorii suplimentari menționați.
export function etichetaPachet(pkg: Exclude<OrgPackage, "trial" | "custom">, extra: number): string {
  const nume = pkg === "start" ? "Pachet START" : pkg === "crestere" ? "Pachet CREȘTERE" : "Pachet IMPACT";
  return extra > 0 ? `${nume} + ${extra} ${extra === 1 ? "utilizator suplimentar" : "utilizatori suplimentari"}` : nume;
}

// Prețul lunar al unui pachet fix, cu utilizatorii suplimentari incluși (null pentru trial).
export function pretLunarPachet(pkg: Exclude<OrgPackage, "custom">, extraUtilizatori = 0): number | null {
  const baza = PACKAGE_LIMITS[pkg].pretLunar;
  if (baza === null) return null;
  return baza + utilizatoriSuplimentariValizi(pkg, extraUtilizatori) * PRET_UTILIZATOR_SUPLIMENTAR;
}

// Facturare anuală: 12 luni de acces, 10 luni plătite (2 luni gratuite). Prețul se calculează mereu server-side.
export const LUNI_ACCES_ANUAL = 12;
export const LUNI_PLATITE_ANUAL = 10;
export type Facturare = "lunar" | "anual";

// Valorile acceptate din client; orice altceva = lunar.
export function facturareValida(cerut: unknown): Facturare {
  return cerut === "anual" ? "anual" : "lunar";
}

export function luniAcces(facturare: Facturare): number {
  return facturare === "anual" ? LUNI_ACCES_ANUAL : 1;
}

// Prețul unei plăți pe perioada aleasă (lună sau an), cu utilizatorii suplimentari incluși; null pentru trial.
export function pretPerioadaPachet(pkg: Exclude<OrgPackage, "custom">, extraUtilizatori: number, facturare: Facturare): number | null {
  const lunar = pretLunarPachet(pkg, extraUtilizatori);
  if (lunar === null) return null;
  return facturare === "anual" ? lunar * LUNI_PLATITE_ANUAL : lunar;
}

// Prețuri anuale de bază (fără utilizatori suplimentari) — derivate din prețul lunar, pentru afișare.
export const PACKAGE_PRICE_ANUAL: Record<Exclude<OrgPackage, "trial" | "custom">, number> = {
  start: PACKAGE_LIMITS.start.pretLunar! * LUNI_PLATITE_ANUAL,
  crestere: PACKAGE_LIMITS.crestere.pretLunar! * LUNI_PLATITE_ANUAL,
  impact: PACKAGE_LIMITS.impact.pretLunar! * LUNI_PLATITE_ANUAL,
};

// Numele afișat al fiecărui pachet fix — folosit în descrierea comenzii Netopia
// (billing-actions.ts) și în emailurile de reînnoire automată (cron).
export const NUME_PACHET_FIX: Record<Exclude<OrgPackage, "trial" | "custom">, string> = {
  start: "Pachet START",
  crestere: "Pachet CREȘTERE",
  impact: "Pachet IMPACT",
};

// Abonamentul platformei se încasează prin Netopia (nu Stripe), lună de lună:
// fiecare plată are prețul din `pretLunar` de mai sus, calculat server-side
// (vezi lib/billing/netopia-checkout.ts). Nu există produse sau prețuri de
// configurat manual în contul Netopia.
