import { calculateCustomPlanPrice, normalizeCustomPlanConfig, type CustomPlanConfigSaved } from "./custom-plan";
import type { OrgPackage } from "./packages";

// Planul ales pe pagina publică de prețuri (/hub), transportat spre
// signup/actions.ts (formular clasic) sau finalize-actions.ts (primul login
// Google) ca query params — vezi plan-query.ts, hub/page.tsx și
// hub/custom-plan-calculator.tsx. Fără asta, alegerea se pierdea la click pe
// CTA (organizația nouă pornea mereu pe "trial", indiferent ce alesese
// userul). Recalculăm totul aici, server-side, exact ca în
// startCustomCheckoutAction/startCheckoutAction din [orgSlug]/billing-actions.ts
// — nu avem încredere în prețul sau configurația primite din URL/formular.
export function citestePlanulAlesDinFormular(
  formData: FormData,
): { package: Exclude<OrgPackage, "trial">; subscriptionStatus: "incomplete"; customPlanConfig: CustomPlanConfigSaved | null } | null {
  const plan = String(formData.get("plan") ?? "");
  if (plan === "start" || plan === "crestere" || plan === "impact") {
    return { package: plan, subscriptionStatus: "incomplete", customPlanConfig: null };
  }
  if (plan === "custom") {
    const config = normalizeCustomPlanConfig({
      utilizatori: Number(formData.get("utilizatori")),
      contactePf: Number(formData.get("contactePf")),
      companiiPj: Number(formData.get("companiiPj")),
      generariLunare: Number(formData.get("generariLunare")),
      tools: String(formData.get("tools") ?? "")
        .split(",")
        .filter(Boolean),
      accesDesignToate: formData.get("accesDesignToate") === "1",
    });
    const pretLunar = calculateCustomPlanPrice(config);
    return { package: "custom", subscriptionStatus: "incomplete", customPlanConfig: { ...config, pretLunar } };
  }
  return null;
}
