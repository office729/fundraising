"use server";

import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { fundraisingDonations, fundraisingPages, organizations } from "@/lib/db/schema";
import { getStripe } from "@/lib/stripe";
import { EMAIL_RE, normalizeazaEmail } from "@/lib/validation";

export type DoneazaState = { error: string | null };

const MAX_LEN = 200;
const MAX_MESAJ_LEN = 1000;

export async function doneazaAction(
  orgSlug: string,
  pageSlug: string,
  _prevState: DoneazaState,
  formData: FormData,
): Promise<DoneazaState> {
  // Honeypot — un bot completează orice câmp, un om nu-l vede.
  if (String(formData.get("website") ?? "").trim()) {
    return { error: null };
  }

  const suma = Math.round(Number(formData.get("suma")));
  if (!Number.isFinite(suma) || suma < 5) {
    return { error: "Suma minimă pentru o donație este 5 lei." };
  }
  if (suma > 50_000) {
    return { error: "Pentru sume mai mari, te rugăm să ne contactezi direct." };
  }

  const numeDonator = String(formData.get("numeDonator") ?? "").trim().slice(0, MAX_LEN);
  // Normalizat (lowercase) — donatori_reali cheie unică pe (org, email);
  // fără asta, "Ion@Test.com" și "ion@test.com" ar crea doi donatori distincți.
  const emailDonator = normalizeazaEmail(String(formData.get("emailDonator") ?? "")).slice(0, MAX_LEN);
  const telefonDonator = String(formData.get("telefonDonator") ?? "").trim().slice(0, MAX_LEN);
  const mesaj = String(formData.get("mesaj") ?? "").trim().slice(0, MAX_MESAJ_LEN);
  const anonim = formData.get("anonim") != null;
  const recurenta = formData.get("recurenta") != null;
  const consimtamantGdpr = formData.get("consimtamantGdpr") != null;
  const consimtamantTermeni = formData.get("consimtamantTermeni") != null;

  if (!numeDonator || !emailDonator) {
    return { error: "Numele și emailul sunt obligatorii." };
  }
  if (!EMAIL_RE.test(emailDonator)) {
    return { error: "Adresa de email nu e validă." };
  }
  if (!consimtamantGdpr || !consimtamantTermeni) {
    return { error: "Trebuie să fii de acord cu politica de date și cu termenii, ca să poți dona." };
  }

  const rezolvat = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const org = await tx.select({ id: organizations.id }).from(organizations).where(eq(organizations.slug, orgSlug)).limit(1);
    if (!org[0]) return null;

    const pagina = await tx
      .select({ id: fundraisingPages.id, titlu: fundraisingPages.titlu, status: fundraisingPages.status })
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.orgId, org[0].id), eq(fundraisingPages.slug, pageSlug)))
      .limit(1);
    if (!pagina[0] || pagina[0].status !== "activa") return null;

    return { orgId: org[0].id, pageId: pagina[0].id, titlu: pagina[0].titlu };
  });

  if (!rezolvat) {
    return { error: "Pagina nu a fost găsită sau nu mai este activă." };
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return { error: "Plățile nu sunt încă activate pentru această platformă — revino în curând." };
  }

  // Formularul e trimis prin POST, deci "origin" e de obicei prezent — dar
  // păstrăm același fallback robust (host + protocol) ca pagina publică, în
  // caz că un browser/proxy nu-l trimite.
  const hdrs = await headers();
  const origin = hdrs.get("origin") ?? `${hdrs.get("x-forwarded-proto") ?? "https"}://${hdrs.get("host")}`;
  const donationId = randomUUID();

  let sessionUrl: string;
  try {
    // Metadata reținută pe ABONAMENT (nu doar pe sesiunea Checkout) — la
    // reînnoirile lunare (webhook invoice.paid) nu mai există o sesiune
    // Checkout de unde s-o citim, doar abonamentul.
    const metadataDonatie = {
      donationId,
      pageId: rezolvat.pageId,
      orgId: rezolvat.orgId,
      numeDonator,
      emailDonator,
      telefonDonator,
      anonim: String(anonim),
      consimtamantGdpr: String(consimtamantGdpr),
      consimtamantTermeni: String(consimtamantTermeni),
    };

    const session = await getStripe().checkout.sessions.create({
      mode: recurenta ? "subscription" : "payment",
      // payment_method_types intenționat NEsetat — Stripe Checkout arată
      // automat orice metodă activată în Dashboard-ul contului (Settings →
      // Payment methods): card e mereu disponibil, Apple Pay/Google Pay apar
      // automat ca portofel în cadrul „card" pe dispozitivele compatibile,
      // iar PayPal/Revolut Pay apar DOAR după ce sunt activate acolo. Dacă
      // le-am fixa explicit aici și nu sunt activate pe cont, sesiunea ar
      // eșua cu eroare — de-aia lăsăm alegerea integral pe Dashboard.
      line_items: [
        {
          price_data: {
            currency: "ron",
            product_data: { name: rezolvat.titlu },
            unit_amount: suma * 100,
            ...(recurenta ? { recurring: { interval: "month" as const } } : {}),
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/strangere-fonduri/${orgSlug}/${pageSlug}/multumim?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/strangere-fonduri/${orgSlug}/${pageSlug}`,
      customer_email: emailDonator || undefined,
      metadata: { donationId, pageId: rezolvat.pageId, orgId: rezolvat.orgId },
      ...(recurenta ? { subscription_data: { metadata: metadataDonatie } } : {}),
    });
    if (!session.url) throw new Error("stripe_session_no_url");
    sessionUrl = session.url;

    // "anonim" ascunde numele DOAR pe afișarea publică (vezi page.tsx) —
    // numele/emailul/telefonul se salvează mereu, organizația are nevoie de
    // ele pentru relația cu donatorul, indiferent de vizibilitatea publică.
    await db.insert(fundraisingDonations).values({
      id: donationId,
      pageId: rezolvat.pageId,
      orgId: rezolvat.orgId,
      numeDonator,
      emailDonator,
      telefonDonator: telefonDonator || null,
      suma,
      mesaj: mesaj || null,
      anonim,
      consimtamantGdpr,
      consimtamantTermeni,
      stripeSessionId: session.id,
      recurenta,
    });
  } catch (e) {
    console.error("creare sesiune Stripe / donatie esuata:", e);
    return { error: "Nu am putut porni plata — încearcă din nou." };
  }

  redirect(sessionUrl);
}
