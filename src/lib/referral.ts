import "server-only";

import { eq } from "drizzle-orm";

import { organizations } from "@/lib/db/schema";
import { genereazaCodScurtUnic } from "@/lib/short-code";

import type { OrgContext } from "./auth/guard";

// Procentul de reducere pentru primul abonament plătit al unei organizații
// care s-a înscris folosind codul de recomandare al alteia — vezi
// lib/billing/netopia-checkout.ts pentru aplicarea efectivă (suma primei plăți
// reușite se reduce cu procentul, calculat server-side).
export const REFERRAL_DISCOUNT_PERCENT = 50;

// Codul de recomandare al unei organizații nu se generează la creare (ar
// complica bootstrap-ul de RLS din signup, care rulează înainte ca
// membership-ul să existe) — se generează leneș, la prima cerere (ex. când
// organizația deschide secțiunea de recomandare din Setări). Funcționează și
// ca auto-backfill pentru organizațiile create înainte de această
// funcționalitate.
export async function getOrCreateReferralCode(ctx: OrgContext): Promise<string> {
  if (ctx.orgReferralCode) return ctx.orgReferralCode;

  const cod = await genereazaCodScurtUnic(async (candidat) => {
    const existent = await ctx.db.select({ id: organizations.id }).from(organizations).where(eq(organizations.referralCode, candidat)).limit(1);
    return Boolean(existent[0]);
  });

  await ctx.db.update(organizations).set({ referralCode: cod }).where(eq(organizations.id, ctx.orgId));
  return cod;
}
