import "server-only";

import { randomUUID } from "node:crypto";

import { and, eq, inArray, ne, sql } from "drizzle-orm";
import type Stripe from "stripe";

import { db } from "@/lib/db";
import { fundraisingDonations, fundraisingPages } from "@/lib/db/schema";
import { htmlEmailMultumireDonatie, subiectEmailMultumireDonatie } from "@/lib/donation-email-template";
import { emailConfigurat, trimiteEmail } from "@/lib/email";
import { raporteazaAvertisment, raporteazaEroare } from "@/lib/monitoring";
import { crediteazaPaginaSiDonator, decrediteazaPaginaSiDonator, recrediteazaPaginaSiDonator } from "@/lib/fundraising-credit";

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
    raporteazaEroare("stripe-email-multumire", e);
  }
}

// Exportat — reutilizat și de express-checkout-actions.ts (donații recurente
// prin fluxul express) ca să extragă id-ul PaymentIntent-ului unei facturi de
// abonament, la crearea abonamentului, nu doar la reînnoire.
export function idDin(ref: string | { id: string } | null | undefined): string | null {
  if (!ref) return null;
  return typeof ref === "string" ? ref : ref.id;
}

export async function proceseazaEvenimentDonatie(event: Stripe.Event, { orgId, stripe }: Ctx): Promise<boolean> {
  // Există o donație a acestei organizații, încă "in_asteptare", legată de acest
  // payment_intent? Fluxul express o are cu stripeSessionId = pi_...; fluxul
  // Checkout o are cu id-ul sesiunii (aflat cu sessions.list). Erori Stripe →
  // false (nu blocăm webhook-ul în bucle de retry pentru plăți care nu sunt ale noastre).
  async function donatieNecreditataCuPaymentIntent(paymentIntentId: string): Promise<boolean> {
    try {
      const chei = [paymentIntentId];
      const sesiuni = await stripe.checkout.sessions.list({ payment_intent: paymentIntentId, limit: 1 });
      if (sesiuni.data[0]) chei.push(sesiuni.data[0].id);
      return await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
        const rand = await tx
          .select({ id: fundraisingDonations.id })
          .from(fundraisingDonations)
          .where(
            and(
              inArray(fundraisingDonations.stripeSessionId, chei),
              eq(fundraisingDonations.orgId, orgId),
              eq(fundraisingDonations.status, "in_asteptare"),
            ),
          )
          .limit(1);
        return Boolean(rand[0]);
      });
    } catch (e) {
      raporteazaEroare("stripe-verificare-necreditata", e, { orgId });
      return false;
    }
  }

  // Singurul loc care confirmă o donație ca reușită — niciodată clientul
  // (pagina de mulțumire), doar acest webhook, verificat prin semnătura Stripe.
  // Actualizările pe fundraising_donations/fundraising_pages sunt gated prin
  // GUC-ul app.public_lookup (vezi scripts/restore-rls.mjs) — context server,
  // de încredere, la fel ca rezolvarea org_id în rutele publice de INSERT.
  // Metodele cu decontare întârziată (debit bancar, voucher) trimit
  // checkout.session.completed cu payment_status "unpaid" — banii NU sunt încă
  // încasați, deci nu creditez; confirmarea vine ulterior prin
  // checkout.session.async_payment_succeeded (același tratament, mai jos).
  if (
    (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") &&
    (event.data.object as Stripe.Checkout.Session).payment_status !== "unpaid"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    let emailParams: Parameters<typeof trimiteEmailMultumireDacaSePoate>[0] | null = null;
    try {
      // La mode="subscription" sesiunea NU are payment_intent — al primei
      // facturi se află din invoicePayments, altfel stripePaymentIntentId rămâne
      // null și nicio rambursare/contestație a primei plăți nu mai găsește
      // donația. Apelul Stripe se face ÎNAINTE de tranzacție (nu ține conexiunea
      // DB ocupată); dacă eșuează, tot handler-ul cade → 500 → Stripe reîncearcă.
      let paymentIntentId = idDin(session.payment_intent);
      const invoiceId = idDin(session.invoice);
      if (!paymentIntentId && invoiceId) {
        const plati = await stripe.invoicePayments.list({ invoice: invoiceId, limit: 1 });
        const plata = plati.data[0]?.payment;
        paymentIntentId = idDin(plata?.payment_intent) ?? idDin(plata?.charge);
      }

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
            stripePaymentIntentId: paymentIntentId,
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
      raporteazaEroare("stripe-checkout-completed", e, { orgId, eveniment: event.id });
      return false;
    }
    if (emailParams) await trimiteEmailMultumireDacaSePoate(emailParams);
  }

  if (event.type === "checkout.session.expired" || event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
        // Doar din "in_asteptare" — un eveniment întârziat nu are voie să
        // coboare o donație deja creditată la "esuata".
        await tx
          .update(fundraisingDonations)
          .set({ status: "esuata" })
          .where(
            and(
              eq(fundraisingDonations.stripeSessionId, session.id),
              eq(fundraisingDonations.orgId, orgId),
              eq(fundraisingDonations.status, "in_asteptare"),
            ),
          );
      });
    } catch (e) {
      raporteazaEroare("stripe-checkout-expirat", e, { orgId, eveniment: event.id });
      return false;
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

            // pageId vine din metadata contului Stripe al ONG-ului — trebuie să
            // fie o pagină a ACESTEI organizații, altfel un ONG și-ar putea
            // insera "donații" (și suma strânsă) pe pagina altei organizații.
            const pagina = await tx
              .select({ id: fundraisingPages.id })
              .from(fundraisingPages)
              .where(and(eq(fundraisingPages.id, md.pageId), eq(fundraisingPages.orgId, orgId)))
              .limit(1);
            if (!pagina[0]) {
              raporteazaAvertisment("stripe-invoice-paid", "pageId din metadata nu aparține organizației", { orgId, pageId: md.pageId, eveniment: event.id });
              return;
            }

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
        raporteazaEroare("stripe-invoice-paid", e, { orgId, eveniment: event.id });
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
      raporteazaEroare("stripe-pi-succeeded", e, { orgId, eveniment: event.id });
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
      raporteazaEroare("stripe-pi-failed", e, { orgId, eveniment: event.id });
    }
  }

  // Rambursare (parțială sau integrală) sau contestație de plată — bani care
  // nu (mai) reprezintă venit efectiv pentru donație/pagină. Corelăm
  // evenimentul cu donația prin stripePaymentIntentId (charge.refunded/
  // charge.dispute.created nu poartă direct sesiunea Checkout sau factura).
  if (event.type === "charge.refunded" || event.type === "charge.dispute.created") {
    const dispute = event.type === "charge.dispute.created" ? (event.data.object as Stripe.Dispute) : null;
    const charge = dispute ? dispute.charge : (event.data.object as Stripe.Charge);
    // O contestație poartă charge ca simplu id (neexpandat) — payment_intent
    // se citește direct de pe ea; altfel candidatul ar fi "ch_...", care nu
    // coincide niciodată cu stripePaymentIntentId ("pi_...") și contestația
    // nu ar găsi donația.
    const paymentIntentId = dispute ? idDin(dispute.payment_intent) : typeof charge === "string" ? null : idDin(charge.payment_intent);
    const chargeId = typeof charge === "string" ? charge : charge.id;
    const candidat = paymentIntentId ?? chargeId; // fallback rar: charge fără payment_intent

    // Suma (în bani) purtată de eveniment: charge.refunded poartă
    // amount_refunded, suma CUMULATIVĂ rambursată pe charge până acum — NU
    // doar rambursarea curentă. O contestație poartă suma disputată.
    const sumaEvenimentBani =
      event.type === "charge.dispute.created"
        ? (event.data.object as Stripe.Dispute).amount
        : (event.data.object as Stripe.Charge).amount_refunded;

    let nemapat = false;
    try {
      await db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

        // FOR UPDATE: două evenimente pe aceeași donație (ex. dispută + rambursare
        // sosite la milisecunde) se serializează — altfel al doilea găsea
        // sumaRambursata schimbat, CAS-ul pierdea și evenimentul se pierdea, cu 200.
        const donatie = await tx
          .select()
          .from(fundraisingDonations)
          .where(and(eq(fundraisingDonations.stripePaymentIntentId, candidat), eq(fundraisingDonations.orgId, orgId)))
          .limit(1)
          .for("update");
        if (!donatie[0]) {
          nemapat = true;
          return;
        }

        // O rambursare PARȚIALĂ (ex. 10 din 100 lei) nu are voie să
        // decrementeze suma întreagă a donației din sumaStransa/totalDonat —
        // doar diferența dintre ce s-a rambursat până acum și ce era deja
        // înregistrat. amount_refunded al lui Stripe e mereu cumulativul pe
        // charge, deci comparăm cu sumaRambursata reținută, nu presupunem
        // orbește "toată donația". O contestație se adaugă la ce era deja
        // rambursat (rar, dar posibil să coexiste pe același charge).
        const sumaRambursataAnterior = donatie[0].sumaRambursata;
        // Contestație deja dedusă (eveniment retrimis) — altfel s-ar aduna a doua oară.
        if (dispute && donatie[0].disputeDeduse[dispute.id] !== undefined) return;
        // În RON, banii Stripe sunt lei*100. La încasările în altă monedă (PayPal, EUR)
        // `suma` e echivalentul în lei, deci convertim proporțional cu suma reală
        // încasată (sumaBani), nu împărțind la 100.
        const baniInLei = (bani: number) =>
          donatie[0].sumaBani ? Math.round((donatie[0].suma * bani) / donatie[0].sumaBani) : Math.round(bani / 100);
        const sumaCumulativa =
          event.type === "charge.dispute.created"
            ? sumaRambursataAnterior + baniInLei(sumaEvenimentBani)
            : baniInLei(sumaEvenimentBani);
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
            ...(dispute
              ? { disputeDeduse: { ...donatie[0].disputeDeduse, [dispute.id]: sumaRambursataNoua - sumaRambursataAnterior } }
              : {}),
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
      raporteazaEroare("stripe-refund-dispute", e, { orgId, eveniment: event.id });
      return false;
    }

    // Nicio donație cu acest payment_intent: fie plata nu e a noastră (contul
    // Stripe al ONG-ului poate încasa și altceva), fie evenimentul a sosit
    // ÎNAINTEA celui de creditare (Stripe nu garantează ordinea). În al doilea
    // caz un 200 ar pierde rambursarea, iar creditarea ulterioară ar număra bani
    // deja returnați — răspundem 500 ca Stripe să reîncerce după ce donația e creditată.
    if (nemapat && paymentIntentId && (await donatieNecreditataCuPaymentIntent(paymentIntentId))) {
      raporteazaAvertisment("stripe-refund-inainte-de-credit", "Rambursare/contestație sosită înaintea creditării — Stripe reîncearcă", { orgId, paymentIntentId, eveniment: event.id });
      return false;
    }
  }

  // Contestație închisă în favoarea ONG-ului — Stripe returnează banii, deci
  // suma dedusă la charge.dispute.created trebuie readusă în progresul
  // campaniei/totalul donatorului. Alte rezultate ("lost") lasă deducerea.
  // "warning_closed" = anchetă (inquiry) închisă fără chargeback.
  if (event.type === "charge.dispute.closed") {
    const dispute = event.data.object as Stripe.Dispute;
    if (dispute.status === "won" || dispute.status === "warning_closed") {
      const candidat = idDin(dispute.payment_intent) ?? (typeof dispute.charge === "string" ? dispute.charge : dispute.charge.id);
      try {
        await db.transaction(async (tx) => {
          await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);

          const donatie = (
            await tx
              .select()
              .from(fundraisingDonations)
              .where(and(eq(fundraisingDonations.stripePaymentIntentId, candidat), eq(fundraisingDonations.orgId, orgId)))
              .limit(1)
          )[0];
          if (!donatie) return;
          const dedus = donatie.disputeDeduse[dispute.id];
          if (dedus === undefined) return; // nedusă niciodată (sau deja inversată) — nimic de readus

          const ramase = { ...donatie.disputeDeduse };
          delete ramase[dispute.id];
          const sumaNoua = Math.max(0, donatie.sumaRambursata - dedus);
          const eraIntegral = donatie.status === "rambursata";

          // Compare-and-swap pe sumaRambursata, ca la deducere — o retrimitere
          // concurentă găsește rândul deja schimbat și iese.
          const actualizat = await tx
            .update(fundraisingDonations)
            .set({
              sumaRambursata: sumaNoua,
              disputeDeduse: ramase,
              ...(eraIntegral && sumaNoua < donatie.suma ? { status: "reusita" as const } : {}),
            })
            .where(and(eq(fundraisingDonations.id, donatie.id), eq(fundraisingDonations.sumaRambursata, donatie.sumaRambursata)))
            .returning({ id: fundraisingDonations.id });
          if (!actualizat[0]) return;

          await recrediteazaPaginaSiDonator(tx, {
            pageId: donatie.pageId,
            orgId: donatie.orgId,
            suma: dedus,
            emailDonator: donatie.emailDonator,
            donatieRedevenitaActiva: eraIntegral && sumaNoua < donatie.suma,
          });
        });
      } catch (e) {
        raporteazaEroare("stripe-dispute-closed", e, { orgId, eveniment: event.id });
        return false;
      }
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
      raporteazaEroare("stripe-subscription-deleted", e, { orgId, eveniment: event.id });
      return false;
    }
  }

  return true;
}
