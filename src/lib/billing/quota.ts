import type { CustomPlanConfigSaved } from "./custom-plan";
import { PACKAGE_LIMITS, type OrgPackage } from "./packages";

// Cotele efective ale unei organizații — singurul loc care știe cum se combină
// PACKAGE_LIMITS (pachete fixe) cu CustomPlanConfigSaved (planul personalizat,
// unde utilizatorul își alege propriile cote, salvate pe organizație). Înainte
// de acest fișier, PACKAGE_LIMITS era citit DOAR în UI-ul de preț/checkout —
// nicăieri la crearea efectivă a unui utilizator/donator/companie, deci cotele
// nu însemnau nimic în practică.
export type LimiteEfective = {
  utilizatori: number | null;
  contactePf: number | null;
  companiiPj: number | null;
};

export function getLimiteleEfective(pkg: OrgPackage, customPlanConfig: CustomPlanConfigSaved | null): LimiteEfective {
  if (pkg === "custom") {
    // Nu ar trebui să existe un org "custom" fără configurație salvată (se
    // salvează împreună la alegerea planului) — dar dacă totuși lipsește,
    // cădem pe cote minime în loc de nelimitat, ca să nu deschidem accidental
    // acces gratuit total.
    if (!customPlanConfig) return { utilizatori: 1, contactePf: 0, companiiPj: 0 };
    return {
      utilizatori: customPlanConfig.utilizatori,
      contactePf: customPlanConfig.contactePf,
      companiiPj: customPlanConfig.companiiPj,
    };
  }
  const limite = PACKAGE_LIMITS[pkg];
  return { utilizatori: limite.utilizatori, contactePf: limite.contactePf, companiiPj: limite.companiiPj };
}

// `null` = nelimitat (convenția deja folosită în PackageLimits).
export function subCota(curent: number, limita: number | null): boolean {
  return limita === null || curent < limita;
}
