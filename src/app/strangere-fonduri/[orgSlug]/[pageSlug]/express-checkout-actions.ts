"use server";

import { randomUUID } from "node:crypto";

import type Stripe from "stripe";

import { db } from "@/lib/db";
import { fundraisingDonations } from "@/lib/db/schema";
import { DONATE_ACTION_ERRORS } from "@/lib/i18n/dictionaries/donation";
import { getLocale } from "@/lib/i18n/get-locale";
import { idDin } from "@/lib/stripe-donation-events";

import { pregatesteDonatie, type DateComuneDonatie } from "./actions";

export type CreeazaIntentState = { ok: true; clientSecret: string } | { ok: false; error: string };

// Fluxul Apple Pay/Google Pay/PayPal (ExpressCheckoutElement, vezi
// express-checkout.tsx) — spre deosebire de doneazaAction (Checkout Session,
// redirect găzduit de Stripe), aici creăm direct un PaymentIntent (sau, la
// donații recurente, un Abonament) pe care Stripe.js îl confirmă client-side,
// în pagină. Reutilizează exact aceleași reguli de validare din actions.ts
// (pregatesteDonatie), ca să nu diverge.
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

  const pregatit = await pregatesteDonatie(orgSlug, pageSlug, formData, errors);
  if (!pregatit.ok) return { ok: false, error: pregatit.error };
  const { date } = pregatit;

  try {
    return date.recurenta ? await creeazaAbonamentExpress(date, errors.plataEsuata) : await creeazaPlataUnicaExpress(date, errors.plataEsuata);
  } catch (e) {
    console.error("creare intenție de plată express checkout:", e);
    return { ok: false, error: errors.plataEsuata };
  }
}

async function creeazaPlataUnicaExpress(date: DateComuneDonatie, eroareGenerica: string): Promise<CreeazaIntentState> {
  const donationId = randomUUID();
  const paymentIntent = await date.stripeOrg.stripe.paymentIntents.create({
    amount: date.suma * 100,
    currency: "ron",
    // La fel ca la Checkout Session — NU fixăm ce metode apar, Stripe arată
    // automat ce e activat în Dashboard-ul contului ONG-ului.
    automatic_payment_methods: { enabled: true },
    receipt_email: date.emailDonator || undefined,
    metadata: { donationId, pageId: date.pageId, orgId: date.orgId },
  });
  if (!paymentIntent.client_secret) {
    console.error("PaymentIntent express fără client_secret");
    return { ok: false, error: eroareGenerica };
  }

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
}

// Donație LUNARĂ prin fluxul express — Checkout Session (mode: "subscription")
// creează intern Clientul/Produsul/Abonamentul Stripe; aici, fără Checkout
// Session, le creăm noi explicit, apoi confirmăm client-side plata primei
// facturi (payment_behavior: "default_incomplete" — patternul documentat de
// Stripe pentru abonamente confirmate prin Elements, nu prin redirect).
async function creeazaAbonamentExpress(date: DateComuneDonatie, eroareGenerica: string): Promise<CreeazaIntentState> {
  const donationId = randomUUID();
  const stripe = date.stripeOrg.stripe;

  const customer = await stripe.customers.create({
    email: date.emailDonator,
    name: date.numeDonator,
    phone: date.telefonDonator || undefined,
  });
  const produs = await stripe.products.create({ name: date.titlu });

  // Metadata pe ABONAMENT (nu doar pe factura curentă) — la reînnoirile
  // lunare (webhook invoice.paid) nu mai există alt loc de unde să citim
  // datele donatorului; aceleași chei ca metadataDonatie din doneazaAction,
  // ca invoice.paid să funcționeze neschimbat indiferent cum a fost creat abonamentul.
  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [
      {
        price_data: {
          currency: "ron",
          product: produs.id,
          unit_amount: date.suma * 100,
          recurring: { interval: "month" },
        },
      },
    ],
    payment_behavior: "default_incomplete",
    payment_settings: { save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice"],
    metadata: {
      donationId,
      pageId: date.pageId,
      orgId: date.orgId,
      numeDonator: date.numeDonator,
      emailDonator: date.emailDonator,
      telefonDonator: date.telefonDonator,
      anonim: String(date.anonim),
      consimtamantGdpr: String(date.consimtamantGdpr),
      consimtamantTermeni: String(date.consimtamantTermeni),
      consimtamantWhatsapp: String(date.consimtamantWhatsapp),
    },
  });

  const invoice = subscription.latest_invoice as Stripe.Invoice | null;
  const clientSecret = invoice?.confirmation_secret?.client_secret;
  if (!invoice || !clientSecret) {
    console.error("Abonament express fără factură/client_secret");
    return { ok: false, error: eroareGenerica };
  }

  // Facturile nu mai expun payment_intent direct în această versiune de API
  // (la fel ca la reînnoirile lunare existente) — trebuie interogat separat.
  const plati = await stripe.invoicePayments.list({ invoice: invoice.id, limit: 1 });
  const paymentIntentId = idDin(plati.data[0]?.payment?.payment_intent) ?? idDin(plati.data[0]?.payment?.charge);
  if (!paymentIntentId) {
    // Fără el, payment_intent.succeeded (stripe-donation-events.ts) n-ar avea
    // după ce să caute rândul — mai bine eșuăm curat aici decât să inserăm o
    // donație care rămâne blocată "în așteptare" pentru totdeauna.
    console.error("Abonament express: nu am putut afla payment_intent-ul primei facturi");
    return { ok: false, error: eroareGenerica };
  }

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
    // stripeSessionId = id-ul PaymentIntent-ului primei facturi, la fel ca la
    // donația unică express — payment_intent.succeeded (stripe-donation-events.ts)
    // caută după exact această coloană, indiferent unic/recurent.
    stripeSessionId: paymentIntentId,
    stripeSubscriptionId: subscription.id,
    recurenta: true,
  });

  return { ok: true, clientSecret };
}
