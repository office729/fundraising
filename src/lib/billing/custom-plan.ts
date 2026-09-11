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
} as const;

export type CustomPlanConfig = {
  utilizatori: number;
  contactePf: number;
  companiiPj: number;
  generariLunare: number;
  tools: ToolId[];
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
}): CustomPlanConfig {
  const clamp = (n: number, min: number, max: number) =>
    Math.min(max, Math.max(min, Math.round(Number.isFinite(n) ? n : min)));

  return {
    utilizatori: clamp(input.utilizatori, MIN_UTILIZATORI, MAX_UTILIZATORI),
    contactePf: clamp(input.contactePf, 0, MAX_CONTACTE_PF),
    companiiPj: clamp(input.companiiPj, 0, MAX_COMPANII_PJ),
    generariLunare: clamp(input.generariLunare, 0, MAX_GENERARI_LUNARE),
    tools: input.tools.filter((t): t is ToolId => (ALL_TOOLS as string[]).includes(t)),
  };
}

export function calculateCustomPlanPrice(config: CustomPlanConfig): number {
  const p = CUSTOM_PLAN_PRICING;
  const utilizatoriSuplimentari = Math.max(0, config.utilizatori - p.utilizatoriInclusi);
  const generariSuplimentare = Math.max(0, config.generariLunare - p.generariIncluse);

  const total =
    p.baza +
    utilizatoriSuplimentari * p.pretPerUtilizator +
    Math.ceil(config.contactePf / 1000) * p.pretPer1000ContactePf +
    Math.ceil(config.companiiPj / 500) * p.pretPer500CompaniiPj +
    config.tools.length * p.pretPerInstrument +
    Math.ceil(generariSuplimentare / 5) * p.pretPer5GenerariSuplimentare;

  return total;
}
