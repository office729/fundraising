import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, ne, sql } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/lib/db";
import { fundraisingDonations } from "@/lib/db/schema";
import { htmlEmailMultumireDonatie, subiectEmailMultumireDonatie } from "@/lib/donation-email-template";
import { emailConfigurat, trimiteEmail } from "@/lib/email";
import { crediteazaPaginaSiDonator, decrediteazaPaginaSiDonator } from "@/lib/fundraising-credit";

// Evenimentele Stripe ale DONAȚIILOR unui ONG, primite pe webhook-ul lui propriu
// (/api/stripe/webhook/<orgSlug>, semnat cu secretul webhook al ONG-ului).
// `orgId` e ONG-ul care a semnat evenimentul: orice donație pe care evenimentul
// ar modifica trebuie să-i aparțină, altfel un ONG și-ar putea crea, din contul
// lui Stripe, "donații" reușite în contul altei organizații.
//
// Returnează `false` doar la o eroare de procesare — ruta răspunde atunci cu
// 500, ca Stripe să reîncerce livrarea (un 200 ar pierde definitiv o plată reală).

type Ctx = { orgId: string; stripe: Stripe };

// Trimite emailul de mulțumire DUPĂ ce tranzacția de creditare s-a închis (nu
// ține conexiunea DB ocupată în timpul apelului HTTP către Resend) —
// best-effort: o eroare aici nu trebuie să facă Stripe să reîncerce webhook-ul,
// plata tot s-a confirmat și creditat, indiferent dacă emailul a plecat.
async function trimiteEmailMultumireDacaSePoate(params: {
  emailDonator: string | null;
  numeDonator: string | null;
  suma: number;
  recurenta: boolean;
  info: { pageTitlu: string; orgName: string } | null;
}) {
  if (!params.emailDonator || !params.info || !emailConfigurat()) return;
  try {
    await trimiteEmail({
      to: params.emailDonator,
      subiect: subiectEmailMultumireDonatie(params.info.orgName),
      html: htmlEmailMultumireDonatie({
        numeDonator: params.numeDonator ?? "Donator",
        suma: params.suma,
        pageTitlu: params.info.pageTitlu,
        orgName: params.info.orgName,
        recurenta: params.recurenta,
      }),
    });
  } catch (e) {
    console.error("Eroare la trimiterea emailului de mulțumire:", e);
  }
}

function idDin(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

export async function proceseazaEvenimentDonatie(event: Stripe.Event, { orgId, stripe }: Ctx): Promise<boolean> {
  // Singurul loc care confirmă o donație ca reușită — niciodată clientul
  // (pagina de mulțumire), doar acest webhook, verificat prin semnătura Stripe.
  // Actualizările pe fundraising_donations/fundraising_pages sunt gated prin
  // GUC-ul app.public_lookup (vezi scripts/restore-rls.mjs) — context server,
  // de încredere, la fel ca rezolvarea org_id în rutele publice de INSERT.
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    let emailParams: Parameters<typeof trimiteEmailMultumireDacaSePoate>[0] | null = null;
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

        const donatie = await tx
          .select()
          .from(fundraisingDonations)
          .where(and(eq(fundraisingDonations.stripeSessionId, session.id), eq(fundraisingDonations.orgId, orgId)))
          .limit(1);
        if (!donatie[0]) return;

        // UPDATE atomic condiționat pe status — dacă Stripe retrimite acest
        // eveniment aproape simultan (retry documentat la livrare), doar UNA
        // dintre cereri va găsi un rând de actualizat; cealaltă primește un
        // rezultat gol și iese fără să crediteze a doua oară (echivalentul
        // unui compare-and-swap la nivel de bază de date — un SELECT urmat de
        // un UPDATE necondiționat NU e suficient, ambele cereri ar putea citi
        // "in_asteptare" înainte ca vreuna să facă commit). Exclus și
        // "rambursata", nu doar "reusita": o retrimitere veche/întârziată a
        // acestui eveniment, ajunsă DUPĂ ce o rambursare a fost deja procesată,
        // nu are voie s-o readucă la "reusita" și să recrediteze bani deja
        // returnați — "reusita" nu mai e stare finală o dată rambursată.
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
          .where(
            and(
              eq(fundraisingDonations.id, donatie[0].id),
              ne(fundraisingDonations.status, "reusita"),
              ne(fundraisingDonations.status, "rambursata"),
            ),
          )
          .returning({ id: fundraisingDonations.id });
        if (!actualizat[0]) return; // deja procesată/rambursată sau o cerere concurentă/retrimisă

        // Sincronizare cu CRM-ul organizației — donatorul real (nu prototipul
        // mock) apare/se actualizează automat, indiferent dacă a bifat
        // "nu-mi afișa numele public" (asta ascunde doar afișarea PUBLICĂ).
        const info = await crediteazaPaginaSiDonator(tx, {
          pageId: donatie[0].pageId,
          orgId: donatie[0].orgId,
          suma: donatie[0].suma,
          numeDonator: donatie[0].numeDonator,
          emailDonator: donatie[0].emailDonator,
          telefonDonator: donatie[0].telefonDonator,
          consimtamantWhatsapp: donatie[0].consimtamantWhatsapp,
        });
        emailParams = {
          emailDonator: donatie[0].emailDonator,
          numeDonator: donatie[0].numeDonator,
          suma: donatie[0].suma,
          recurenta: donatie[0].recurenta,
          info,
        };
      });
    } catch (e) {
      console.error("Eroare la procesarea checkout.session.completed:", e);
      return false;
    }
    if (emailParams) await trimiteEmailMultumireDacaSePoate(emailParams);
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
        await tx
          .update(fundraisingDonations)
          .set({ status: "esuata" })
          .where(and(eq(fundraisingDonations.stripeSessionId, session.id), eq(fundraisingDonations.orgId, orgId)));
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
      let emailParams: Parameters<typeof trimiteEmailMultumireDacaSePoate>[0] | null = null;
      try {
        const subscription = await stripe.subscriptions.retrieve(subId);
        const md = subscription.metadata;
        // Metadata vine din contul Stripe al ONG-ului — nu are voie să indice
        // altă organizație decât cea care a semnat evenimentul.
        if (md.pageId && md.orgId === orgId) {
          await db.transaction(async (tx) => {
            await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

            const dejaExista = await tx
              .select({ id: fundraisingDonations.id })
              .from(fundraisingDonations)
              .where(eq(fundraisingDonations.stripeSessionId, `invoice_${orgId}_${invoice.id}`))
              .limit(1);
            if (dejaExista[0]) return; // idempotent — webhook poate fi retrimis de Stripe

            const suma = Math.round(invoice.amount_paid / 100);

            // La fel ca la checkout.session.completed — necesar pentru
            // corelarea unei eventuale rambursări a ACESTEI reînnoiri.
            // Facturile nu mai expun payment_intent direct (restructurat sub
            // InvoicePayments) — trebuie interogat separat.
            const plati = await stripe.invoicePayments.list({ invoice: invoice.id, limit: 1 });
            const platoInvoice = plati.data[0]?.payment;
            const paymentIntentId = idDin(platoInvoice?.payment_intent) ?? idDin(platoInvoice?.charge);

            await tx.insert(fundraisingDonations).values({
              id: randomUUID(),
              pageId: md.pageId,
              orgId,
              numeDonator: md.numeDonator || null,
              emailDonator: md.emailDonator || null,
              telefonDonator: md.telefonDonator || null,
              suma,
              anonim: md.anonim === "true",
              consimtamantGdpr: md.consimtamantGdpr === "true",
              consimtamantTermeni: md.consimtamantTermeni === "true",
              consimtamantWhatsapp: md.consimtamantWhatsapp === "true",
              // Prefixat cu orgId: id-urile de factură sunt unice doar în contul
              // Stripe al fiecărui ONG, dar coloana e unică global.
              stripeSessionId: `invoice_${orgId}_${invoice.id}`,
              recurenta: true,
              stripeSubscriptionId: subId,
              stripePaymentIntentId: paymentIntentId,
              status: "reusita",
            });

            const info = await crediteazaPaginaSiDonator(tx, {
              pageId: md.pageId,
              orgId,
              suma,
              numeDonator: md.numeDonator || null,
              emailDonator: md.emailDonator || null,
              telefonDonator: md.telefonDonator || null,
              consimtamantWhatsapp: md.consimtamantWhatsapp === "true",
            });
            emailParams = {
              emailDonator: md.emailDonator || null,
              numeDonator: md.numeDonator || null,
              suma,
              recurenta: true,
              info,
            };
          });
        }
      } catch (e) {
        console.error("Eroare la procesarea invoice.paid (reînnoire abonament):", e);
        // Răspuns de eroare — NU 200 — ca Stripe să reîncerce livrarea. Un 200
        // aici ar însemna că o reînnoire încasată real nu mai ajunge NICIODATĂ
        // în sumaStransa/donatoriReali, fără nicio alertă vizibilă.
        return false;
      }
      if (emailParams) await trimiteEmailMultumireDacaSePoate(emailParams);
    }
  }

  // Donație unică prin fluxul express (Apple Pay/Google Pay/PayPal, vezi
  // express-checkout-actions.ts) — spre deosebire de checkout.session.completed,
  // aici rândul a fost inserat cu stripeSessionId = id-ul PaymentIntent-ului
  // direct (nu al unei sesiuni Checkout). Corelarea prin stripeSessionId
  // discriminează automat de PaymentIntent-urile create INTERN de o sesiune
  // Checkout (fluxul vechi) — acelea au stripeSessionId = "cs_...", niciodată
  // "pi_...", deci un payment_intent.succeeded provenit din fluxul vechi pur
  // și simplu nu găsește niciun rând aici și iese fără efect.
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    let emailParams: Parameters<typeof trimiteEmailMultumireDacaSePoate>[0] | null = null;
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

        const donatie = await tx
          .select()
          .from(fundraisingDonations)
          .where(and(eq(fundraisingDonations.stripeSessionId, paymentIntent.id), eq(fundraisingDonations.orgId, orgId)))
          .limit(1);
        if (!donatie[0]) return; // nu e un rând din fluxul express (probabil un PaymentIntent al fluxului Checkout)

        // Același compare-and-swap ca la checkout.session.completed.
        const actualizat = await tx
          .update(fundraisingDonations)
          .set({ status: "reusita", stripePaymentIntentId: paymentIntent.id })
          .where(
            and(
              eq(fundraisingDonations.id, donatie[0].id),
              ne(fundraisingDonations.status, "reusita"),
              ne(fundraisingDonations.status, "rambursata"),
            ),
          )
          .returning({ id: fundraisingDonations.id });
        if (!actualizat[0]) return; // deja procesată sau o cerere concurentă/retrimisă

        const info = await crediteazaPaginaSiDonator(tx, {
          pageId: donatie[0].pageId,
          orgId: donatie[0].orgId,
          suma: donatie[0].suma,
          numeDonator: donatie[0].numeDonator,
          emailDonator: donatie[0].emailDonator,
          telefonDonator: donatie[0].telefonDonator,
          consimtamantWhatsapp: donatie[0].consimtamantWhatsapp,
        });
        emailParams = {
          emailDonator: donatie[0].emailDonator,
          numeDonator: donatie[0].numeDonator,
          suma: donatie[0].suma,
          recurenta: false,
          info,
        };
      });
    } catch (e) {
      console.error("Eroare la procesarea payment_intent.succeeded:", e);
      return false;
    }
    if (emailParams) await trimiteEmailMultumireDacaSePoate(emailParams);
  }

  if (event.type === "payment_intent.payment_failed") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
        await tx
          .update(fundraisingDonations)
          .set({ status: "esuata" })
          .where(
            and(
              eq(fundraisingDonations.stripeSessionId, paymentIntent.id),
              eq(fundraisingDonations.orgId, orgId),
              eq(fundraisingDonations.status, "in_asteptare"),
            ),
          );
      });
    } catch (e) {
      console.error("Eroare la procesarea payment_intent.payment_failed:", e);
    }
  }

  // Rambursare (parțială sau integrală) sau contestație de plată — bani care
  // nu (mai) reprezintă venit efectiv pentru donație/pagină. Corelăm
  // evenimentul cu donația prin stripePaymentIntentId (charge.refunded/
  // charge.dispute.created nu poartă direct sesiunea Checkout sau factura).
  if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
    const charge =
      event.type === "charge.dispute.created" ? (event.data.object as Stripe.Dispute).charge : (event.data.object as Stripe.Charge);
    const paymentIntentId = typeof charge === "string" ? null : idDin(charge.payment_intent);
    const chargeId = typeof charge === "string" ? charge : charge.id;
    const candidat = paymentIntentId ?? chargeId; // fallback rar: charge fără payment_intent

    // Suma (în bani) purtată de eveniment: charge.refunded poartă
    // amount_refunded, suma CUMULATIVĂ rambursată pe charge până acum — NU
    // doar rambursarea curentă. O contestație poartă suma disputată.
    const sumaEvenimentBani =
      event.type === "charge.dispute.created"
        ? (event.data.object as Stripe.Dispute).amount
        : (event.data.object as Stripe.Charge).amount_refunded;

    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

        const donatie = await tx
          .select()
          .from(fundraisingDonations)
          .where(and(eq(fundraisingDonations.stripePaymentIntentId, candidat), eq(fundraisingDonations.orgId, orgId)))
          .limit(1);
        if (!donatie[0]) return; // nicio donație locală cu acest payment_intent

        // O rambursare PARȚIALĂ (ex. 10 din 100 lei) nu are voie să
        // decrementeze suma întreagă a donației din sumaStransa/totalDonat —
        // doar diferența dintre ce s-a rambursat până acum și ce era deja
        // înregistrat. amount_refunded al lui Stripe e mereu cumulativul pe
        // charge, deci comparăm cu sumaRambursata reținută, nu presupunem
        // orbește "toată donația". O contestație se adaugă la ce era deja
        // rambursat (rar, dar posibil să coexiste pe același charge).
        const sumaRambursataAnterior = donatie[0].sumaRambursata;
        const sumaCumulativa =
          event.type === "charge.dispute.created"
            ? sumaRambursataAnterior + Math.round(sumaEvenimentBani / 100)
            : Math.round(sumaEvenimentBani / 100);
        const sumaRambursataNoua = Math.min(donatie[0].suma, Math.max(sumaRambursataAnterior, sumaCumulativa));
        if (sumaRambursataNoua <= sumaRambursataAnterior) return; // eveniment vechi/retrimis — nimic nou de decrementat

        const integralRambursata = sumaRambursataNoua >= donatie[0].suma;

        // UPDATE atomic condiționat pe valoarea CITITĂ a sumaRambursata —
        // compare-and-swap, la fel ca la checkout.session.completed: dacă
        // Stripe retrimite evenimentul sau două rambursări parțiale ajung
        // aproape simultan, doar o cerere găsește rândul neschimbat și
        // decrementează; ne(status,...) exclude donații niciodată creditate
        // (in_asteptare/esuata) — decrementarea lor ar scădea bani care
        // n-au fost adăugați niciodată în sumaStransa/totalDonat.
        const actualizat = await tx
          .update(fundraisingDonations)
          .set({
            sumaRambursata: sumaRambursataNoua,
            status: integralRambursata ? "rambursata" : "reusita",
          })
          .where(
            and(
              eq(fundraisingDonations.id, donatie[0].id),
              eq(fundraisingDonations.sumaRambursata, sumaRambursataAnterior),
              ne(fundraisingDonations.status, "in_asteptare"),
              ne(fundraisingDonations.status, "esuata"),
            ),
          )
          .returning({ id: fundraisingDonations.id });
        if (!actualizat[0]) return; // altă cerere concurentă/retrimisă a apucat deja, sau donația nu era creditată

        await decrediteazaPaginaSiDonator(tx, {
          pageId: donatie[0].pageId,
          orgId: donatie[0].orgId,
          suma: sumaRambursataNoua - sumaRambursataAnterior,
          emailDonator: donatie[0].emailDonator,
          integralRambursata,
        });
      });
    } catch (e) {
      console.error("Eroare la procesarea charge.refunded/charge.dispute.created:", e);
      return false;
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
          .where(and(eq(fundraisingDonations.stripeSubscriptionId, subscription.id), eq(fundraisingDonations.orgId, orgId)));
      });
    } catch (e) {
      console.error("Eroare la procesarea customer.subscription.deleted:", e);
      return false;
    }
  }

  return true;
}
