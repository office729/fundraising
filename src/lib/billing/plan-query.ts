// Cheile care duc alegerea de plan de pe /hub până la crearea organizației —
// fie prin query params spre /signup (formularul clasic email/parolă), fie
// prin `next` al redirect-ului OAuth Google (/auth/callback -> pagina de
// marketing -> FinalizeForm, vezi finalize-actions.ts). Aceleași chei, citite
// și scrise identic în toate punctele, ca formatul să rămână un singur loc.
export const PLAN_QUERY_KEYS = [
  "plan",
  "utilizatori",
  "contactePf",
  "companiiPj",
  "generariLunare",
  "tools",
  "accesDesignToate",
] as const;

export type PlanQueryKey = (typeof PLAN_QUERY_KEYS)[number];
export type PlanQueryValues = Partial<Record<PlanQueryKey, string>>;

// `get` abstractizează sursa (URLSearchParams.get, sau un lookup într-un
// obiect simplu primit ca prop de server) — extrage DOAR cheile cunoscute,
// ignorând orice alt query param aflat pe pagină.
export function extractPlanQuery(get: (key: string) => string | null | undefined): PlanQueryValues {
  const out: PlanQueryValues = {};
  for (const key of PLAN_QUERY_KEYS) {
    const value = get(key);
    if (value != null) out[key] = value;
  }
  return out;
}

export function planQueryString(values: PlanQueryValues): string {
  const params = new URLSearchParams();
  for (const key of PLAN_QUERY_KEYS) {
    const value = values[key];
    if (value != null) params.set(key, value);
  }
  return params.toString();
}
