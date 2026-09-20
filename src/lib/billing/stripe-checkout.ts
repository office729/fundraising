import "server-only";

import { eq } from "drizzle-orm";

import type { OrgContext } from "@/lib/auth/guard";
import { organizations } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe";

import { REFERRAL_DISCOUNT_PERCENT } from "../referral";

// Id fix (nu generat) — un singur cupon reutilizat pentru TOATE reducerile de
// recomandare, nu unul per organizație. `retrieve` întâi, `create` doar dacă
// nu există încă — idempotent, fără niciun pas manual în Stripe Dashboard.
const CUPON_REFERRAL_ID = "referral-50-prima-luna";

async function asigurCuponReferral(): Promise<string> {
  const stripe = getStripe();
  try {
    await stripe.coupons.retrieve(CUPON_REFERRAL_ID);
  } catch {
    await stripe.coupons.create({
      id: CUPON_REFERRAL_ID,
      percent_off: REFERRAL_DISCOUNT_PERCENT,
      duration: "once",
      name: "Recomandare — 50% prima lună",
    });
  }
  return CUPON_REFERRAL_ID;
}

// Creează Clientul Stripe la prima nevoie (prima încercare de abonare a
// organizației) și îl salvează — reutilizat la toate încercările ulterioare
// (schimbare de pachet, reînnoiri), la fel cum un donator recurent păstrează
// un singur abonament Stripe pe durata lui.
async function asigurStripeCustomer(ctx: OrgContext): Promise<string> {
  if (ctx.orgStripeCustomerId) return ctx.orgStripeCustomerId;

  const customer = await getStripe().customers.create({
    email: ctx.userEmail,
    name: ctx.orgName,
    metadata: { orgId: ctx.orgId },
  });
  await ctx.db.update(organizations).set({ stripeCustomerId: customer.id }).where(eq(organizations.id, ctx.orgId));
  return customer.id;
}

// Sesiune Stripe Checkout pentru abonamentul PLATFORMEI (nu o donație) — preț
// dinamic (`price_data`), exact tiparul deja folosit pentru donații (vezi
// strangere-fonduri/[orgSlug]/[pageSlug]/actions.ts), ca să nu fie nevoie de
// niciun Produs/Preț pre-creat în Stripe Dashboard. `metadata.type
// = "org_subscription"` marchează sesiunea/abonamentul ca fiind al
// platformei, nu al unei donații — webhook-ul (api/stripe/webhook/route.ts)
// se bazează pe asta ca să nu amestece cele două fluxuri.
export async function creeazaSesiuneAbonament(
  ctx: OrgContext,
  params: { pretLunar: number; packageLabel: string; origin: string },
): Promise<string> {
  const customerId = await asigurStripeCustomer(ctx);

  // Reducerea se aplică DOAR dacă organizația a fost recomandată ȘI nu a
  // avut niciodată un abonament Stripe (primul abonament, o singură dată) —
  // recalculat aici, server-side, niciodată acceptat de la client.
  const areDreptulLaReducere = Boolean(ctx.orgReferredByOrgId) && !ctx.orgStripeSubscriptionId;

  const session = await getStripe().checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: "ron",
          product_data: { name: `Alexandrit — ${params.packageLabel}` },
          unit_amount: params.pretLunar * 100,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    ...(areDreptulLaReducere ? { discounts: [{ coupon: await asigurCuponReferral() }] } : {}),
    success_url: `${params.origin}/${ctx.orgSlug}/crm?abonament=succes`,
    cancel_url: `${params.origin}/${ctx.orgSlug}/setari?abonament=anulat`,
    metadata: { type: "org_subscription", orgId: ctx.orgId },
    subscription_data: { metadata: { type: "org_subscription", orgId: ctx.orgId } },
  });
  if (!session.url) throw new Error("stripe_session_no_url");
  return session.url;
}
