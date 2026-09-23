"use server";

import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";
import { fundraisingDonations } from "@/lib/db/schema";
import { DONATE_ACTION_ERRORS } from "@/lib/i18n/dictionaries/donation";
import { getLocale } from "@/lib/i18n/get-locale";

import { pregatesteDonatie } from "./actions";

export type CreeazaIntentState = { ok: true; clientSecret: string } | { ok: false; error: string };

// Fluxul Apple Pay/Google Pay/PayPal (ExpressCheckoutElement, vezi
// express-checkout.tsx) — spre deosebire de doneazaAction (Checkout Session,
// redirect găzduit de Stripe), aici creăm direct un PaymentIntent, pe care
// Stripe.js îl confirmă client-side, în pagină. Reutilizează exact aceleași
// reguli de validare din actions.ts (pregatesteDonatie), ca să nu diverge.
// Doar donații UNICE — recurentele rămân exclusiv pe fluxul Checkout Session.
export async function creeazaIntentDonatieAction(
  orgSlug: string,
  pageSlug: string,
  formData: FormData,
): Promise<CreeazaIntentState> {
  const errors = DONATE_ACTION_ERRORS[await getLocale()];

  // Honeypot — un bot completează orice câmp, un om nu-l vede. Spre deosebire
  // de doneazaAction (unde un honeypot declanșat întoarce succes fals, tăcut,
  // ca botul să nu-și dea seama), aici întoarcem o eroare generică — nu există
  // o „reușită tăcută" sensibilă la fluxul express, care oricum nu redirecționează.
  if (String(formData.get("website") ?? "").trim()) {
    return { ok: false, error: errors.plataEsuata };
  }

  if (formData.get("recurenta") != null) {
    return { ok: false, error: errors.recurentaNesuportataExpress };
  }

  const pregatit = await pregatesteDonatie(orgSlug, pageSlug, formData, errors);
  if (!pregatit.ok) return { ok: false, error: pregatit.error };
  const { date } = pregatit;

  const donationId = randomUUID();
  try {
    const paymentIntent = await date.stripeOrg.stripe.paymentIntents.create({
      amount: date.suma * 100,
      currency: "ron",
      // La fel ca la Checkout Session — NU fixăm ce metode apar, Stripe arată
      // automat ce e activat în Dashboard-ul contului ONG-ului.
      automatic_payment_methods: { enabled: true },
      receipt_email: date.emailDonator || undefined,
      metadata: { donationId, pageId: date.pageId, orgId: date.orgId },
    });
    if (!paymentIntent.client_secret) throw new Error("stripe_payment_intent_no_secret");

    // "anonim" ascunde numele DOAR pe afișarea publică — numele/emailul/
    // telefonul se salvează mereu, la fel ca la fluxul Checkout Session.
    await db.insert(fundraisingDonations).values({
      id: donationId,
      pageId: date.pageId,
      orgId: date.orgId,
      numeDonator: date.numeDonator,
      emailDonator: date.emailDonator,
      telefonDonator: date.telefonDonator || null,
      suma: date.suma,
      mesaj: date.mesaj || null,
      anonim: date.anonim,
      consimtamantGdpr: date.consimtamantGdpr,
      consimtamantTermeni: date.consimtamantTermeni,
      consimtamantWhatsapp: date.consimtamantWhatsapp,
      // Aceeași coloană generică ca la Checkout Session (id de sesiune) și ca
      // la reînnoirile de abonament ("invoice_..."): "orice identificator
      // Stripe unic al acestei încercări de plată".
      stripeSessionId: paymentIntent.id,
      recurenta: false,
    });

    return { ok: true, clientSecret: paymentIntent.client_secret };
  } catch (e) {
    console.error("creare PaymentIntent express checkout:", e);
    return { ok: false, error: errors.plataEsuata };
  }
}
