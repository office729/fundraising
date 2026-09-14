import { ALL_TOOLS, type ToolId } from "./packages";

// Planul "à la carte" — vezi paywall.tsx. Formula de preț a fost stabilită
// manual (nu derivată din START/CREȘTERE/IMPACT) și trebuie recalculată
// mereu server-side (chooseCustomPlanAction), niciodată acceptată de la client.
export const CUSTOM_PLAN_PRICING = {
  baza: 29,
  utilizatoriInclusi: 1,
  pretPerUtilizator: 15,
  pretPer1000ContactePf: 8,
  pretPer500CompaniiPj: 5,
  pretPerInstrument: 7,
  generariIncluse: 3,
  pretPer5GenerariSuplimentare: 10,
  // Acces la toate design-urile de campanie (nu doar cele din domeniul de
  // activitate ales) — vezi src/lib/campaign-templates.ts.
  pretAccesDesignToate: 19,
} as const;

export type CustomPlanConfig = {
  utilizatori: number;
  contactePf: number;
  companiiPj: number;
  generariLunare: number;
  tools: ToolId[];
  accesDesignToate: boolean;
};

export type CustomPlanConfigSaved = CustomPlanConfig & { pretLunar: number };

const MIN_UTILIZATORI = 1;
const MAX_UTILIZATORI = 50;
const MAX_CONTACTE_PF = 500_000;
const MAX_COMPANII_PJ = 100_000;
const MAX_GENERARI_LUNARE = 1000;

// Validează și "clampuiește" input-ul brut (de la un formular) la limite
// rezonabile — apărare împotriva unui payload manipulat (numere negative,
// uriașe, instrumente inexistente), nu doar UX.
export function normalizeCustomPlanConfig(input: {
  utilizatori: number;
  contactePf: number;
  companiiPj: number;
  generariLunare: number;
  tools: string[];
  accesDesignToate?: boolean;
}): CustomPlanConfig {
  const clamp = (n: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)));

  return {
    utilizatori: clamp(input.utilizatori, MIN_UTILIZATORI, MAX_UTILIZATORI),
    contactePf: clamp(input.contactePf, 0, MAX_CONTACTE_PF),
    companiiPj: clamp(input.companiiPj, 0, MAX_COMPANII_PJ),
    generariLunare: clamp(input.generariLunare, 0, MAX_GENERARI_LUNARE),
    tools: input.tools.filter((t): t is ToolId => (ALL_TOOLS as string[]).includes(t)),
    accesDesignToate: Boolean(input.accesDesignToate),
  };
}

// Cheia identifică rândul (pentru etichetă + traducere în UI); ordinea din
// array e ordinea de afișare recomandată. Rândurile cu cost 0 NU sunt
// incluse — un breakdown de tip "factură" nu listează linii goale.
export type CustomPlanBreakdownKey =
  | "baza"
  | "utilizatori"
  | "contactePf"
  | "companiiPj"
  | "instrumente"
  | "generari"
  | "accesDesignToate";
export type CustomPlanBreakdownItem = { key: CustomPlanBreakdownKey; amount: number };

export function calculateCustomPlanBreakdown(config: CustomPlanConfig): CustomPlanBreakdownItem[] {
  const p = CUSTOM_PLAN_PRICING;
  const utilizatoriSuplimentari = Math.max(0, config.utilizatori - p.utilizatoriInclusi);
  const generariSuplimentare = Math.max(0, config.generariLunare - p.generariIncluse);

  const items: CustomPlanBreakdownItem[] = [
    { key: "baza", amount: p.baza },
    { key: "utilizatori", amount: utilizatoriSuplimentari * p.pretPerUtilizator },
    { key: "contactePf", amount: Math.ceil(config.contactePf / 1000) * p.pretPer1000ContactePf },
    { key: "companiiPj", amount: Math.ceil(config.companiiPj / 500) * p.pretPer500CompaniiPj },
    { key: "instrumente", amount: config.tools.length * p.pretPerInstrument },
    { key: "generari", amount: Math.ceil(generariSuplimentare / 5) * p.pretPer5GenerariSuplimentare },
    { key: "accesDesignToate", amount: config.accesDesignToate ? p.pretAccesDesignToate : 0 },
  ];

  return items.filter((item) => item.amount > 0);
}

export function calculateCustomPlanPrice(config: CustomPlanConfig): number {
  return calculateCustomPlanBreakdown(config).reduce((sum, item) => sum + item.amount, 0);
}
