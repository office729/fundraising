import { NextResponse } from "next/server";
import StripeSDK from "stripe";
import type Stripe from "stripe";

import { stripeOrgDupaSlug } from "@/lib/org-stripe";
import { proceseazaEvenimentDonatie } from "@/lib/stripe-donation-events";

// Webhook-ul Stripe al UNUI ONG: fiecare organizație își creează în contul ei
// Stripe un endpoint către /api/stripe/webhook/<slug-ul ei> (URL-ul exact e
// afișat în Setări → Plăți donații) și ne dă secretul lui de semnare. Semnătura
// se verifică aici cu secretul acelui ONG — un eveniment semnat de altcineva nu
// trece. Platforma nu are cont Stripe, deci nu există un webhook global.
export async function POST(req: Request, { params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const semnatura = req.headers.get("stripe-signature");
  if (!semnatura) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  let stripeOrg: Awaited<ReturnType<typeof stripeOrgDupaSlug>>;
  try {
    stripeOrg = await stripeOrgDupaSlug(orgSlug);
  } catch (e) {
    console.error("cheia Stripe a organizației nu a putut fi citită (webhook):", e);
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });
  }
  if (!stripeOrg?.webhookSecret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    // Verifică doar semnătura HMAC cu secretul webhook al acestui ONG.
    event = StripeSDK.webhooks.constructEvent(rawBody, semnatura, stripeOrg.webhookSecret);
  } catch (e) {
    console.error("Semnătură webhook Stripe invalidă:", e);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  const ok = await proceseazaEvenimentDonatie(event, { orgId: stripeOrg.orgId, stripe: stripeOrg.stripe });
  if (!ok) return NextResponse.json({ error: "processing_failed" }, { status: 500 });

  return NextResponse.json({ received: true });
}
