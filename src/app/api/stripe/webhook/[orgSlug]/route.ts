import { NextResponse } from "next/server";
import StripeSDK from "stripe";
import type Stripe from "stripe";

import { raporteazaAvertisment, raporteazaEroare } from "@/lib/monitoring";
import { stripeOrgDupaId, stripeOrgDupaSlug } from "@/lib/org-stripe";
import { proceseazaEvenimentDonatie } from "@/lib/stripe-donation-events";

// Webhook-ul Stripe al UNUI ONG: fiecare organizație își creează în contul ei
// Stripe un endpoint către /api/stripe/webhook/<slug-ul ei> (URL-ul exact e
// afișat în Setări → Plăți donații) și ne dă secretul lui de semnare. Semnătura
// se verifică aici cu secretul acelui ONG — un eveniment semnat de altcineva nu
// trece. Platforma nu are cont Stripe, deci nu există un webhook global.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request, { params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const semnatura = req.headers.get("stripe-signature");
  if (!semnatura) {
    return NextResponse.json({ error: "missing_signature" }, { status: 400 });
  }

  // Segmentul din URL poate fi ID-ul organizației (URL-ul afișat acum în Setări — nu se schimbă niciodată) sau slug-ul
  // (URL-uri deja configurate în Stripe înainte; se strică dacă se redenumește adresa organizației).
  let stripeOrg: Awaited<ReturnType<typeof stripeOrgDupaSlug>>;
  try {
    stripeOrg = UUID_RE.test(orgSlug) ? await stripeOrgDupaId(orgSlug) : await stripeOrgDupaSlug(orgSlug);
  } catch (e) {
    raporteazaEroare("stripe-webhook-cheie", e, { orgSlug });
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });
  }
  if (stripeOrg && !stripeOrg.webhookSecret) {
    // Cheie salvată, dar fără secret de webhook: donațiile ar rămâne „în așteptare" fără nicio urmă.
    raporteazaAvertisment("stripe-webhook", "organizație cu cheie Stripe dar fără secret de webhook", { orgId: stripeOrg.orgId });
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
