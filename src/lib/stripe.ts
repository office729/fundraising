import "server-only";

import Stripe from "stripe";

// Lazy — construit doar la prima folosire reală (Checkout/webhook), nu la
// încărcarea modulului. Stripe aruncă imediat dacă apiKey e string gol, ceea
// ce ar bloca build-ul/orice rută care doar importă acest fișier atâta timp
// cât STRIPE_SECRET_KEY nu e configurată (local sau înainte de activare).
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY nu e configurată.");
    _stripe = new Stripe(key, { apiVersion: "2026-07-29.dahlia" });
  }
  return _stripe;
}
