import type { OrgPackage } from "./packages";

// 14 zile de probă, fără card, de la crearea organizației — după care
// accesul se blochează dacă nu s-a ales (și confirmat manual) un pachet.
export const TRIAL_DAYS = 14;

export function trialEndsAt(orgCreatedAt: Date): Date {
  return new Date(orgCreatedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export function trialDaysRemaining(orgCreatedAt: Date): number {
  const msLeft = trialEndsAt(orgCreatedAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

// Blocat = proba s-a terminat ȘI nu există un abonament activ. "incomplete"
// (pachet ales, plată neconfirmată încă) rămâne blocat — vezi
// choosePackageAction din billing-actions.ts: alegerea unui pachet
// înregistrează intenția, nu activează accesul (nu există plată automată,
// activarea o face manual proprietarul platformei după confirmarea plății).
export function isAccessBlocked(org: {
  createdAt: Date;
  subscriptionStatus: string;
  package: OrgPackage;
}): boolean {
  if (org.subscriptionStatus === "active") return false;
  return trialDaysRemaining(org.createdAt) <= 0;
}
