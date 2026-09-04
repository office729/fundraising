import { randomUUID } from "node:crypto";

import { and, eq, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import StripeSDK from "stripe";
import type Stripe from "stripe";

import { db } from "@/lib/db";
import type { Tx } from "@/lib/db";
import { donatoriReali, fundraisingDonations, fundraisingPages } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe";

// Incrementează cache-ul sumei strânse pe pagină și sincronizează donatorul
// real (CRM) — comun donației inițiale (checkout.session.completed) și
// reînnoirilor lunare (invoice.paid). NU se apelează dacă donatorul n-a lăsat
// un email (nu poate fi sincronizat în CRM), dar suma tot se adaugă pe pagină.
async function crediteazaPaginaSiDonator(
  tx: Tx,
  params: { pageId: string; orgId: string; suma: number; numeDonator: string | null; emailDonator: string | null; telefonDonator: string | null },
) {
  const pagina = await tx.select({ titlu: fundraisingPages.titlu }).from(fundraisingPages).where(eq(fundraisingPages.id, params.pageId)).limit(1);

  await tx
    .update(fundraisingPages)
    .set({ sumaStransa: sql`${fundraisingPages.sumaStransa} + ${params.suma}` })
    .where(eq(fundraisingPages.id, params.pageId));

  if (!params.emailDonator) return;

  const sursa = `Pagină strângere fonduri: ${pagina[0]?.titlu ?? "necunoscută"}`;
  await tx
    .insert(donatoriReali)
    .values({
      id: randomUUID(),
      orgId: params.orgId,
      nume: params.numeDonator ?? "Donator",
      email: params.emailDonator,
      telefon: params.telefonDonator,
      sursa,
      metodaPlata: "Card (Stripe)",
      totalDonat: params.suma,
      numarDonatii: 1,
    })
    .onConflictDoUpdate({
      target: [donatoriReali.orgId, donatoriReali.email],
      set: {
        nume: params.numeDonator ?? sql`${donatoriReali.nume}`,
        telefon: params.telefonDonator ?? sql`${donatoriReali.telefon}`,
        sursa,
        totalDonat: sql`${donatoriReali.totalDonat} + ${params.suma}`,
        numarDonatii: sql`${donatoriReali.numarDonatii} + 1`,
        ultimaDonatieLa: sql`now()`,
      },
    });
}

// Simetricul lui crediteazaPaginaSiDonator — apelat la rambursare/contestație,
// pentru o donație deja "reusita". greatest(0, ...) evită sume negative dacă
// vreodată cache-ul era deja desincronizat.
async function decrediteazaPaginaSiDonator(
  tx: Tx,
  params: { pageId: string; orgId: string; suma: number; emailDonator: string | null },
) {
  await tx
    .update(fundraisingPages)
    .set({ sumaStransa: sql`greatest(0, ${fundraisingPages.sumaStransa} - ${params.suma})` })
    .where(eq(fundraisingPages.id, params.pageId));

  if (!params.emailDonator) return;

  await tx
    .update(donatoriReali)
    .set({
      totalDonat: sql`greatest(0, ${donatoriReali.totalDonat} - ${params.suma})`,
      numarDonatii: sql`greatest(0, ${donatoriReali.numarDonatii} - 1)`,
    })
    .where(and(eq(donatoriReali.orgId, params.orgId), eq(donatoriReali.email, params.emailDonator)));
}

function idDin(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

// Singurul loc care confirmă o donație ca reușită — niciodată clientul
// (pagina de mulțumire), doar acest webhook, verificat prin semnătura Stripe.
// Actualizările pe fundraising_donations/fundraising_pages sunt gated prin
// GUC-ul app.public_lookup (vezi scripts/restore-rls.mjs) — context server,
// de încredere, la fel ca rezolvarea org_id în rutele publice de INSERT.
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    // Metodă statică — verifică doar semnătura HMAC cu STRIPE_WEBHOOK_SECRET,
    // nu are nevoie de un client Stripe autentificat (getStripe()/STRIPE_SECRET_KEY).
    // Altfel, o cheie API lipsă ar fi raportată greșit drept "semnătură invalidă",
    // în loc de eroarea de configurare reală.
    event = StripeSDK.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (e) {
    console.error("Semnătură webhook Stripe invalidă:", e);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

        const donatie = await tx
          .select()
          .from(fundraisingDonations)
          .where(eq(fundraisingDonations.stripeSessionId, session.id))
          .limit(1);
        if (!donatie[0]) return;

        // UPDATE atomic condiționat pe status — dacă Stripe retrimite acest
        // eveniment aproape simultan (retry documentat la livrare), doar UNA
        // dintre cereri va găsi un rând de actualizat; cealaltă primește un
        // rezultat gol și iese fără să crediteze a doua oară (echivalentul
        // unui compare-and-swap la nivel de bază de date — un SELECT urmat de
        // un UPDATE necondiționat NU e suficient, ambele cereri ar putea citi
        // "in_asteptare" înainte ca vreuna să facă commit).
        const actualizat = await tx
          .update(fundraisingDonations)
          .set({
            status: "reusita",
            // Prezent doar pentru mode="subscription" — necesar la reînnoiri
            // (webhook invoice.paid), ca să identificăm abonamentul.
            stripeSubscriptionId: idDin(session.subscription),
            // Necesar pentru a corela o eventuală rambursare/contestație
            // (charge.refunded/charge.dispute.created) înapoi la această
            // donație — acele evenimente nu poartă sesiunea Checkout.
            stripePaymentIntentId: idDin(session.payment_intent),
          })
          .where(and(eq(fundraisingDonations.id, donatie[0].id), ne(fundraisingDonations.status, "reusita")))
          .returning({ id: fundraisingDonations.id });
        if (!actualizat[0]) return; // deja procesată de o cerere concurentă/retrimisă

        // Sincronizare cu CRM-ul organizației — donatorul real (nu prototipul
        // mock) apare/se actualizează automat, indiferent dacă a bifat
        // "nu-mi afișa numele public" (asta ascunde doar afișarea PUBLICĂ).
        await crediteazaPaginaSiDonator(tx, {
          pageId: donatie[0].pageId,
          orgId: donatie[0].orgId,
          suma: donatie[0].suma,
          numeDonator: donatie[0].numeDonator,
          emailDonator: donatie[0].emailDonator,
          telefonDonator: donatie[0].telefonDonator,
        });
      });
    } catch (e) {
      console.error("Eroare la procesarea checkout.session.completed:", e);
      return NextResponse.json({ error: "processing_failed" }, { status: 500 });
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
        await tx
          .update(fundraisingDonations)
          .set({ status: "esuata" })
          .where(eq(fundraisingDonations.stripeSessionId, session.id));
      });
    } catch (e) {
      console.error("Eroare la procesarea checkout.session.expired:", e);
    }
  }

  // Reînnoire lunară a unui abonament (donație recurentă). "subscription_create"
  // e prima factură — deja creată/marcată prin checkout.session.completed de
  // mai sus, deci o ignorăm aici ca să nu numărăm donația de două ori; doar
  // "subscription_cycle" (reînnoirile ulterioare) creează un rând nou.
  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionRef = invoice.parent?.subscription_details?.subscription;
    const subId = typeof subscriptionRef === "string" ? subscriptionRef : (subscriptionRef?.id ?? null);

    if (invoice.billing_reason === "subscription_cycle" && subId) {
      try {
        const subscription = await getStripe().subscriptions.retrieve(subId);
        const md = subscription.metadata;
        if (md.pageId && md.orgId) {
          await db.transaction(async (tx) => {
            await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

            const dejaExista = await tx
              .select({ id: fundraisingDonations.id })
              .from(fundraisingDonations)
              .where(eq(fundraisingDonations.stripeSessionId, `invoice_${invoice.id}`))
              .limit(1);
            if (dejaExista[0]) return; // idempotent — webhook poate fi retrimis de Stripe

            const suma = Math.round(invoice.amount_paid / 100);

            // La fel ca la checkout.session.completed — necesar pentru
            // corelarea unei eventuale rambursări a ACESTEI reînnoiri.
            // Facturile nu mai expun payment_intent direct (restructurat sub
            // InvoicePayments) — trebuie interogat separat.
            const plati = await getStripe().invoicePayments.list({ invoice: invoice.id, limit: 1 });
            const platoInvoice = plati.data[0]?.payment;
            const paymentIntentId = idDin(platoInvoice?.payment_intent) ?? idDin(platoInvoice?.charge);

            await tx.insert(fundraisingDonations).values({
              id: randomUUID(),
              pageId: md.pageId,
              orgId: md.orgId,
              numeDonator: md.numeDonator || null,
              emailDonator: md.emailDonator || null,
              telefonDonator: md.telefonDonator || null,
              suma,
              anonim: md.anonim === "true",
              consimtamantGdpr: md.consimtamantGdpr === "true",
              consimtamantTermeni: md.consimtamantTermeni === "true",
              stripeSessionId: `invoice_${invoice.id}`,
              recurenta: true,
              stripeSubscriptionId: subId,
              stripePaymentIntentId: paymentIntentId,
              status: "reusita",
            });

            await crediteazaPaginaSiDonator(tx, {
              pageId: md.pageId,
              orgId: md.orgId,
              suma,
              numeDonator: md.numeDonator || null,
              emailDonator: md.emailDonator || null,
              telefonDonator: md.telefonDonator || null,
            });
          });
        }
      } catch (e) {
        console.error("Eroare la procesarea invoice.paid (reînnoire abonament):", e);
        // Răspuns de eroare — NU 200 — ca Stripe să reîncerce livrarea. Un 200
        // aici ar însemna că o reînnoire încasată real nu mai ajunge NICIODATĂ
        // în sumaStransa/donatoriReali, fără nicio alertă vizibilă.
        return NextResponse.json({ error: "processing_failed" }, { status: 500 });
      }
    }
  }

  // Rambursare sau contestație de plată — o donație deja "reusita" nu (mai)
  // reprezintă bani primiți efectiv. Corelăm evenimentul cu donația prin
  // stripePaymentIntentId (charge.refunded/charge.dispute.created nu poartă
  // direct sesiunea Checkout sau factura) și decrementăm simetric.
  if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
    const charge =
      event.type === "charge.dispute.created" ? (event.data.object as Stripe.Dispute).charge : (event.data.object as Stripe.Charge);
    const paymentIntentId = typeof charge === "string" ? null : idDin(charge.payment_intent);
    const chargeId = typeof charge === "string" ? charge : charge.id;
    const candidat = paymentIntentId ?? chargeId; // fallback rar: charge fără payment_intent

    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

        const donatie = await tx
          .select()
          .from(fundraisingDonations)
          .where(eq(fundraisingDonations.stripePaymentIntentId, candidat))
          .limit(1);
        if (!donatie[0]) return; // nicio donație locală cu acest payment_intent

        const actualizat = await tx
          .update(fundraisingDonations)
          .set({ status: "rambursata" })
          .where(and(eq(fundraisingDonations.id, donatie[0].id), eq(fundraisingDonations.status, "reusita")))
          .returning({ id: fundraisingDonations.id });
        if (!actualizat[0]) return; // nu era "reusita" (deja rambursată/eșuată) — nimic de decrementat

        await decrediteazaPaginaSiDonator(tx, {
          pageId: donatie[0].pageId,
          orgId: donatie[0].orgId,
          suma: donatie[0].suma,
          emailDonator: donatie[0].emailDonator,
        });
      });
    } catch (e) {
      console.error("Eroare la procesarea charge.refunded/charge.dispute.created:", e);
      return NextResponse.json({ error: "processing_failed" }, { status: 500 });
    }
  }

  // Abonament lunar anulat (dunning epuizat sau anulare directă) — singurul
  // semnal din date că un donator recurent s-a oprit. NU atinge sumele deja
  // încasate (rămân "reusita" — banii chiar au fost primiți), doar marchează
  // abonamentul ca inactiv pe toate rândurile asociate lui.
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
        await tx
          .update(fundraisingDonations)
          .set({ abonamentActiv: false })
          .where(eq(fundraisingDonations.stripeSubscriptionId, subscription.id));
      });
    } catch (e) {
      console.error("Eroare la procesarea customer.subscription.deleted:", e);
      return NextResponse.json({ error: "processing_failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
