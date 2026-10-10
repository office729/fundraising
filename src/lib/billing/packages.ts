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
    campaniiActive: 1,
    conturi230: 1,
    voluntariActivitati: false,
    avatarComplet: false,
    domeniuPropriu: false,
  },
  crestere: {
    pretLunar: 149,
    utilizatori: 3,
    contactePf: 10_000,
    companiiPj: 2_000,
    onePagerActive: 5,
    rapoarteCompaniiPeLuna: 15,
    contracteSponsorizarePeLuna: null,
    documenteD177PeLuna: null,
    newsletterBiblioteca: "completa",
    programLucru: "echipa",
    campaniiActive: 5,
    conturi230: 3,
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

// Prețuri anuale — 2 luni gratuite (din pagina de prețuri). Doar informativ
// azi (Paywall/Setări afișează prețul anual, dar checkout-ul real e
// lunar-only — vezi lib/billing/netopia-checkout.ts).
export const PACKAGE_PRICE_ANUAL: Record<Exclude<OrgPackage, "trial" | "custom">, number> = {
  start: 490,
  crestere: 1490,
  impact: 2990,
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
