import { useMemo } from "react";

import { calculateCustomPlanPrice, normalizeCustomPlanConfig } from "./custom-plan";
import { PACKAGE_LIMITS, type OrgPackage } from "./packages";
import type { PlanQueryValues } from "./plan-query";

const PLAN_NUME: Record<Exclude<OrgPackage, "trial" | "custom">, string> = {
  start: "START",
  crestere: "CREȘTERE",
  impact: "IMPACT",
};

// Rezumatul planului ales pe /hub (fix sau à la carte), pentru afișare pe
// /signup și pe formularul de finalizare Google (finalize-form.tsx) — doar
// UI, nu scrie nimic; plan-from-form.ts reface aceeași normalizare + calcul
// de preț server-side, la momentul creării organizației.
export function useAlegerePlan(values: PlanQueryValues): { nume: string; pret: number | null } | null {
  const { plan, utilizatori, contactePf, companiiPj, generariLunare, tools, accesDesignToate } = values;
  return useMemo(() => {
    if (plan === "start" || plan === "crestere" || plan === "impact") {
      return { nume: PLAN_NUME[plan], pret: PACKAGE_LIMITS[plan].pretLunar };
    }
    if (plan === "custom") {
      const config = normalizeCustomPlanConfig({
        utilizatori: Number(utilizatori),
        contactePf: Number(contactePf),
        companiiPj: Number(companiiPj),
        generariLunare: Number(generariLunare),
        tools: (tools ?? "").split(",").filter(Boolean),
        accesDesignToate: accesDesignToate === "1",
      });
      return { nume: "Plan personalizat", pret: calculateCustomPlanPrice(config) };
    }
    return null;
  }, [plan, utilizatori, contactePf, companiiPj, generariLunare, tools, accesDesignToate]);
}
