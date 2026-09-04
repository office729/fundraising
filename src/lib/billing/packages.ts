// Sursă de adevăr: pagina de prețuri "Hub Fundraising" (Fundraising Academy).
// Toate pachetele plătite includ TOATE instrumentele — diferența dintre
// START / CREȘTERE / IMPACT e prin COTE (utilizatori, contacte, generări
// lunare), nu prin acces la instrumente. "trial" (14 zile, fără card) are
// cote generoase, nivel IMPACT, ca ONG-ul să poată evalua platforma complet.
//
// Aplicarea efectivă a cotelor (blocare la depășire, contorizare lunară
// pentru rapoarte/contracte/D177) e Faza 1/2 — aici e doar structura de date.

export type OrgPackage = "trial" | "start" | "crestere" | "impact";

export type ToolId =
  | "one-pager"
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
  "raport-companii",
  "newsletter-pf",
  "newsletter-pj",
  "crm",
  "crm-pj",
  "contract-sponsorizare",
  "crm-pf",
  "program-lucru",
];

export function orgHasToolAccess(_pkg: OrgPackage, _tool: ToolId): boolean {
  return true;
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
};

export const PACKAGE_LIMITS: Record<OrgPackage, PackageLimits> = {
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
  },
  start: {
    pretLunar: 49,
    utilizatori: 1,
    contactePf: 1_000,
    companiiPj: 50,
    onePagerActive: 1,
    rapoarteCompaniiPeLuna: 3,
    contracteSponsorizarePeLuna: 5,
    documenteD177PeLuna: 5,
    newsletterBiblioteca: "standard",
    programLucru: "individual",
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
  },
};

// Prețuri anuale — 2 luni gratuite (din pagina de prețuri).
export const PACKAGE_PRICE_ANUAL: Record<Exclude<OrgPackage, "trial">, number> = {
  start: 490,
  crestere: 1490,
  impact: 2990,
};

// Stripe Price IDs — completate în Faza 1, după crearea produselor în
// dashboard-ul Stripe (test + live separat). Câte 2 per pachet (lunar/anual).
export const PACKAGE_PRICE_IDS: Record<
  Exclude<OrgPackage, "trial">,
  { lunar: string | null; anual: string | null }
> = {
  start: { lunar: null, anual: null },
  crestere: { lunar: null, anual: null },
  impact: { lunar: null, anual: null },
};
