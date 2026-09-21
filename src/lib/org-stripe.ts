import "server-only";

import { eq, sql, type SQL } from "drizzle-orm";
import Stripe from "stripe";

import { db } from "@/lib/db";
import { organizations } from "@/lib/db/schema";
import { decripteaza } from "@/lib/secret-box";

// Platforma NU are cont Stripe. Fiecare ONG își face propriul cont și ne dă
// cheia secretă + secretul webhook-ului (Setări → Plăți donații); donațiile de
// pe paginile lui de campanie se încasează direct în contul lui, iar platforma
// doar creează sesiunea Checkout și primește confirmarea. Abonamentul
// platformei nu trece pe aici — se încasează prin Netopia (lib/netopia.ts).

const API_VERSION = "2026-07-29.dahlia" as const;

export function stripePentruCheie(cheieSecreta: string): Stripe {
  return new Stripe(cheieSecreta, { apiVersion: API_VERSION });
}

export type StripeOrg = {
  orgId: string;
  orgName: string;
  stripe: Stripe;
  // Null dacă ONG-ul a salvat cheia dar nu (încă) secretul webhook-ului.
  webhookSecret: string | null;
};

// Rezolvarea se face în contextul de încredere `app.public_lookup` (același ca
// la rutele publice de donații și la webhook-uri): un vizitator anonim nu are
// sesiune de membru, dar trebuie să poată porni o donație către ONG-ul căruia
// îi aparține pagina. Cheile decriptate rămân doar în memoria serverului.
async function incarca(conditie: SQL): Promise<StripeOrg | null> {
  const rand = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const rows = await tx
      .select({
        id: organizations.id,
        name: organizations.name,
        secret: organizations.donationStripeSecretEnc,
        webhook: organizations.donationStripeWebhookSecretEnc,
      })
      .from(organizations)
      .where(conditie)
      .limit(1);
    return rows[0] ?? null;
  });
  if (!rand?.secret) return null;

  return {
    orgId: rand.id,
    orgName: rand.name,
    stripe: stripePentruCheie(decripteaza(rand.secret)),
    webhookSecret: rand.webhook ? decripteaza(rand.webhook) : null,
  };
}

export function stripeOrgDupaSlug(orgSlug: string) {
  return incarca(eq(organizations.slug, orgSlug));
}

export function stripeOrgDupaId(orgId: string) {
  return incarca(eq(organizations.id, orgId));
}
