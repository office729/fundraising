"use server";

import { randomUUID } from "node:crypto";

import { headers } from "next/headers";
import type Stripe from "stripe";

import { db } from "@/lib/db";
import { fundraisingDonations } from "@/lib/db/schema";
import { obtineIpClient } from "@/lib/auth/rate-limit";
import { cursEurRon } from "@/lib/curs-valutar";
import { DONATE_ACTION_ERRORS } from "@/lib/i18n/dictionaries/donation";
import { getLocale } from "@/lib/i18n/get-locale";
import { idDin } from "@/lib/stripe-donation-events";

import { pregatesteDonatie, type DateComuneDonatie } from "./actions";

// redirectUrl: la metodele cu redirect (Revolut Pay), adresa la care trimitem clientul.
export type CreeazaIntentState = { ok: true; clientSecret: string; redirectUrl?: string } | { ok: false; error: string };

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

  const pregatit = await pregatesteDonatie(orgSlug, pageSlug, formData, errors, { acordImplicit: true });
  if (!pregatit.ok) return { ok: false, error: pregatit.error };
  const { date } = pregatit;

  try {
    return date.recurenta ? await creeazaAbonamentExpress(date, errors.plataEsuata) : await creeazaPlataUnicaExpress(date, errors.plataEsuata);
  } catch (e) {
    console.error("creare intenție de plată express checkout:", e);
    return { ok: false, error: errors.plataEsuata };
  }
}

// Revolut Pay: donație unică sau lunară (în RON, acceptat de Revolut Pay). Formularul cere
// numele și emailul; acordul pentru Termeni/GDPR e dat prin plată, ca la
// portofele. Confirmarea reală rămâne a webhook-ului (payment_intent.succeeded).
export async function creeazaIntentRevolutAction(
  orgSlug: string,
  pageSlug: string,
  formData: FormData,
): Promise<CreeazaIntentState> {
  const errors = DONATE_ACTION_ERRORS[await getLocale()];
  if (String(formData.get("website") ?? "").trim()) return { ok: false, error: errors.plataEsuata };

  const pregatit = await pregatesteDonatie(orgSlug, pageSlug, formData, errors, { acordImplicit: true });
  if (!pregatit.ok) return { ok: false, error: pregatit.error };

  try {
    const hdrs = await headers();
    const origin = hdrs.get("origin") ?? `${hdrs.get("x-forwarded-proto") ?? "https"}://${hdrs.get("host")}`;
    const redirect = {
      metoda: "revolut_pay" as const,
      returnUrl: `${origin}/strangere-fonduri/${orgSlug}/${pageSlug}/multumim`,
    };
    const rezultat = pregatit.date.recurenta
      ? await creeazaAbonamentRedirect(pregatit.date, errors.plataEsuata, redirect)
      : await creeazaPlataUnicaExpress(pregatit.date, errors.plataEsuata, redirect);
    // Fără adresă de redirect nu putem duce clientul la Revolut.
    if (rezultat.ok && !rezultat.redirectUrl) return { ok: false, error: errors.plataEsuata };
    return rezultat;
  } catch (e) {
    console.error("creare intenție de plată Revolut Pay:", e);
    return { ok: false, error: errors.plataEsuata };
  }
}

// PayPal (prin Stripe): NU acceptă RON — donația se face în EUR (ca pe
// fundatianektarios.ro). În platformă se reține echivalentul în lei la cursul
// momentului, iar suma reală în EUR rămâne în sumaBani/moneda pentru rambursări.
// Donație unică sau lunară; confirmarea reală rămâne a webhook-ului
// (payment_intent.succeeded la prima plată, invoice.paid la reînnoiri).
export async function creeazaIntentPaypalAction(
  orgSlug: string,
  pageSlug: string,
  formData: FormData,
): Promise<CreeazaIntentState> {
  const errors = DONATE_ACTION_ERRORS[await getLocale()];
  if (String(formData.get("website") ?? "").trim()) return { ok: false, error: errors.plataEsuata };

  const sumaEur = Number(String(formData.get("sumaEur") ?? "").replace(",", "."));
  if (!Number.isFinite(sumaEur) || sumaEur < 1) return { ok: false, error: errors.sumaMinima };
  if (sumaEur > 10_000) return { ok: false, error: errors.sumaMaxima };
  const eurCenti = Math.round(sumaEur * 100);

  const curs = await cursEurRon();
  if (!curs) return { ok: false, error: errors.plataEsuata };
  const sumaLei = Math.round((eurCenti / 100) * curs);

  // Regulile comune (nume, email, limită de rată, pagina, contul Stripe) rulează pe
  // aceeași cale ca celelalte metode, cu suma în lei calculată de noi.
  const date = new FormData();
  formData.forEach((valoare, cheie) => {
    if (cheie !== "suma") date.append(cheie, valoare);
  });
  date.set("suma", String(sumaLei));
  const pregatit = await pregatesteDonatie(orgSlug, pageSlug, date, errors, { acordImplicit: true });
  if (!pregatit.ok) return { ok: false, error: pregatit.error };

  try {
    const hdrs = await headers();
    const origin = hdrs.get("origin") ?? `${hdrs.get("x-forwarded-proto") ?? "https"}://${hdrs.get("host")}`;
    const redirect = {
      metoda: "paypal" as const,
      returnUrl: `${origin}/strangere-fonduri/${orgSlug}/${pageSlug}/multumim`,
      eurCenti,
      cursEur: curs,
    };
    const rezultat = pregatit.date.recurenta
      ? await creeazaAbonamentRedirect(pregatit.date, errors.plataEsuata, redirect)
      : await creeazaPlataUnicaExpress(pregatit.date, errors.plataEsuata, redirect);
    if (rezultat.ok && !rezultat.redirectUrl) return { ok: false, error: errors.plataEsuata };
    return rezultat;
  } catch (e) {
    console.error("creare intenție de plată PayPal:", e);
    return { ok: false, error: errors.plataEsuata };
  }
}

// Donație LUNARĂ prin metode cu redirect (Revolut Pay în RON, PayPal în EUR). Ca la
// abonamentul cu portofel, creăm Clientul/Produsul/Abonamentul explicit, dar prima
// factură se confirmă pe SERVER cu metoda aleasă și clientul e dus la autentificare.
// Reînnoirile lunare se încasează apoi automat (acord online = mandat).
async function creeazaAbonamentRedirect(
  date: DateComuneDonatie,
  eroareGenerica: string,
  redirect: { metoda: "revolut_pay" | "paypal"; returnUrl: string; eurCenti?: number; cursEur?: number },
): Promise<CreeazaIntentState> {
  const donationId = randomUUID();
  const stripe = date.stripeOrg.stripe;
  const eurCenti = redirect.eurCenti;

  const customer = await stripe.customers.create({
    email: date.emailDonator,
    name: date.numeDonator,
    phone: date.telefonDonator || undefined,
  });
  const produs = await stripe.products.create({ name: date.titlu });

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [
      {
        price_data: {
          currency: eurCenti ? "eur" : "ron",
          product: produs.id,
          unit_amount: eurCenti ?? date.suma * 100,
          recurring: { interval: "month" },
        },
      },
    ],
    payment_behavior: "default_incomplete",
    payment_settings: { payment_method_types: [redirect.metoda], save_default_payment_method: "on_subscription" },
    expand: ["latest_invoice"],
    // Aceleași chei ca la abonamentul cu portofel (webhook-ul invoice.paid le citește
    // de aici la reînnoiri) + moneda: în EUR, reînnoirile se convertesc în lei la cursul
    // lunii respective (cursEur = curs de rezervă, dacă sursa de curs nu răspunde atunci).
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
      ...(eurCenti ? { moneda: "eur", cursEur: String(redirect.cursEur ?? "") } : {}),
    },
  });

  const invoice = subscription.latest_invoice as Stripe.Invoice | null;
  if (!invoice) {
    console.error("Abonament redirect fără factură");
    return { ok: false, error: eroareGenerica };
  }
  const plati = await stripe.invoicePayments.list({ invoice: invoice.id, limit: 1 });
  const paymentIntentId = idDin(plati.data[0]?.payment?.payment_intent) ?? idDin(plati.data[0]?.payment?.charge);
  if (!paymentIntentId) {
    console.error("Abonament redirect: nu am putut afla payment_intent-ul primei facturi");
    return { ok: false, error: eroareGenerica };
  }

  // Confirmare pe server, cu acordul online al donatorului (mandat pentru reînnoiri).
  const hdrs = await headers();
  const ip = await obtineIpClient();
  const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId, {
    payment_method_data: {
      type: redirect.metoda,
      billing_details: { name: date.numeDonator, email: date.emailDonator },
    },
    return_url: redirect.returnUrl,
    mandate_data: {
      customer_acceptance: {
        type: "online",
        online: { ip_address: /^[0-9a-f:.]+$/i.test(ip) ? ip : "0.0.0.0", user_agent: hdrs.get("user-agent") ?? "necunoscut" },
      },
    },
  });

  await db.insert(fundraisingDonations).values({
    id: donationId,
    pageId: date.pageId,
    orgId: date.orgId,
    numeDonator: date.numeDonator,
    emailDonator: date.emailDonator,
    telefonDonator: date.telefonDonator || null,
    suma: date.suma,
    ...(eurCenti ? { sumaBani: eurCenti, moneda: "eur" } : {}),
    mesaj: date.mesaj || null,
    anonim: date.anonim,
    consimtamantGdpr: date.consimtamantGdpr,
    consimtamantTermeni: date.consimtamantTermeni,
    consimtamantWhatsapp: date.consimtamantWhatsapp,
    stripeSessionId: paymentIntentId,
    stripeSubscriptionId: subscription.id,
    recurenta: true,
  });

  return {
    ok: true,
    clientSecret: paymentIntent.client_secret ?? "",
    redirectUrl: paymentIntent.next_action?.redirect_to_url?.url ?? undefined,
  };
}

async function creeazaPlataUnicaExpress(
  date: DateComuneDonatie,
  eroareGenerica: string,
  // Revolut Pay și PayPal nu sunt portofele de tip ExpressCheckoutElement: se plătesc
  // prin redirect (către Revolut / PayPal), deci intenția se creează doar cu acea
  // metodă și se confirmă chiar pe server (întoarce adresa de autentificare).
  // `eurCenti`: PayPal nu acceptă RON — se încasează în EUR, iar `date.suma` (lei)
  // reține echivalentul la cursul momentului.
  redirect?: { metoda: "revolut_pay" | "paypal"; returnUrl: string; eurCenti?: number; cursEur?: number },
): Promise<CreeazaIntentState> {
  const donationId = randomUUID();
  const eurCenti = redirect?.eurCenti;
  const paymentIntent = await date.stripeOrg.stripe.paymentIntents.create({
    amount: eurCenti ?? date.suma * 100,
    currency: eurCenti ? "eur" : "ron",
    // La fel ca la Checkout Session — NU fixăm ce metode apar, Stripe arată
    // automat ce e activat în Dashboard-ul contului ONG-ului.
    ...(redirect
      ? {
          payment_method_types: [redirect.metoda],
          confirm: true,
          return_url: redirect.returnUrl,
          payment_method_data: {
            type: redirect.metoda,
            billing_details: { name: date.numeDonator, email: date.emailDonator },
          },
        }
      : { automatic_payment_methods: { enabled: true } }),
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
    // Doar pentru încasările în altă monedă decât RON (PayPal, EUR): suma reală la
    // Stripe, în unități minore, folosită la rambursări/contestații.
    ...(eurCenti ? { sumaBani: eurCenti, moneda: "eur" } : {}),
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

  return {
    ok: true,
    clientSecret: paymentIntent.client_secret,
    redirectUrl: paymentIntent.next_action?.redirect_to_url?.url ?? undefined,
  };
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
