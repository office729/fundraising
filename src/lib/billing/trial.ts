import type { OrgPackage } from "./packages";

// 14 zile de probă, fără card, de la crearea organizației — după care
// accesul se blochează dacă nu s-a ales (și confirmat manual) un pachet.
export const TRIAL_DAYS = 14;

// Contul(ele) administratorului platformei — niciodată blocate de perioada
// de probă, indiferent de organizația în care lucrează. Nu afectează
// clienții reali (vezi isAccessBlocked mai jos).
const PLATFORM_ADMIN_EMAILS = [
  "vlad.placinta@alexandrit.ro",
  "vlad.placinta@fundrasingacademy.ro",
  "office@salveazaoinima.ro",
  "andrei.placinta@alexandrit.ro",
];

export function isPlatformAdmin(userEmail?: string | null): boolean {
  return Boolean(userEmail && PLATFORM_ADMIN_EMAILS.includes(userEmail.toLowerCase()));
}

export function trialEndsAt(orgCreatedAt: Date): Date {
  return new Date(orgCreatedAt.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
}

export function trialDaysRemaining(orgCreatedAt: Date): number {
  const msLeft = trialEndsAt(orgCreatedAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
}

// Blocat = proba s-a terminat ȘI nu există acces plătit valabil. Accesul plătit =
// starea "active" ȘI perioada plătită încă nu a expirat — abonamentul platformei
// se încasează lună de lună prin Netopia (plăți separate, nu reînnoire
// automată), deci `currentPeriodEnd` decide, nu doar starea. O plată abia
// pornită nu schimbă nimic: accesul se acordă doar când IPN-ul verificat al
// Netopia o confirmă (api/netopia/ipn/route.ts), niciodată optimist.
// `currentPeriodEnd` null cu stare "active" = rânduri mai vechi, fără dată de
// sfârșit — rămân active, ca să nu blocăm pe nimeni retroactiv.
export function isAccessBlocked(
  org: {
    createdAt: Date;
    subscriptionStatus: string;
    package: OrgPackage;
    currentPeriodEnd?: Date | null;
  },
  userEmail?: string,
): boolean {
  if (isPlatformAdmin(userEmail)) return false;
  if (org.subscriptionStatus === "active" && (!org.currentPeriodEnd || org.currentPeriodEnd > new Date())) return false;
  return trialDaysRemaining(org.createdAt) <= 0;
}
