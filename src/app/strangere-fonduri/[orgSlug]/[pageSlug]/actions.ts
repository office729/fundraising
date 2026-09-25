"use server";

import { randomUUID } from "node:crypto";

import { and, eq, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { obtineIpClient, verificaLimitaRata } from "@/lib/auth/rate-limit";
import { db } from "@/lib/db";
import { fundraisingDonations, fundraisingPages, organizations } from "@/lib/db/schema";
import { DONATE_ACTION_ERRORS } from "@/lib/i18n/dictionaries/donation";
import { getLocale } from "@/lib/i18n/get-locale";
import { stripeOrgDupaSlug } from "@/lib/org-stripe";
import { EMAIL_RE, normalizeazaEmail } from "@/lib/validation";

export type DoneazaState = { error: string | null };

const MAX_LEN = 200;
const MAX_MESAJ_LEN = 1000;

export type DateComuneDonatie = {
  suma: number;
  numeDonator: string;
  emailDonator: string;
  telefonDonator: string;
  mesaj: string;
  anonim: boolean;
  recurenta: boolean;
  consimtamantGdpr: boolean;
  consimtamantTermeni: boolean;
  consimtamantWhatsapp: boolean;
  orgId: string;
  pageId: string;
  titlu: string;
  stripeOrg: NonNullable<Awaited<ReturnType<typeof stripeOrgDupaSlug>>>;
};

// Validarea + rezolvarea comună (sumă, câmpuri, consimțăminte, pagina/org,
// contul Stripe al ONG-ului) — folosită atât de fluxul clasic (Checkout
// Session, mai jos) cât și de fluxul express (Apple Pay/Google Pay/PayPal,
// vezi express-checkout-actions.ts), ca să nu se dubleze regulile în două
// locuri care ar putea diverge silențios.
export async function pregatesteDonatie(
  orgSlug: string,
  pageSlug: string,
  formData: FormData,
  errors: (typeof DONATE_ACTION_ERRORS)[keyof typeof DONATE_ACTION_ERRORS],
): Promise<{ ok: false; error: string } | { ok: true; date: DateComuneDonatie }> {
  // Limită per IP, comună fluxului clasic și celui express (ambele trec pe aici):
  // fiecare încercare validă creează o sesiune/PaymentIntent în contul Stripe al
  // ONG-ului și un rând de donație — fără limită, un bot le umple.
  if (!(await verificaLimitaRata("donatie", await obtineIpClient(), 15, 10))) {
    return { ok: false, error: errors.preaMulteIncercari };
  }
  const suma = Math.round(Number(formData.get("suma")));
  if (!Number.isFinite(suma) || suma < 5) {
    return { ok: false, error: errors.sumaMinima };
  }
  if (suma > 50_000) {
    return { ok: false, error: errors.sumaMaxima };
  }

  const numeDonator = String(formData.get("numeDonator") ?? "").trim().slice(0, MAX_LEN);
  // Normalizat (lowercase) — donatori_reali cheie unică pe (org, email);
  // fără asta, "Ion@Test.com" și "ion@test.com" ar crea doi donatori distincți.
  const emailDonator = normalizeazaEmail(String(formData.get("emailDonator") ?? "")).slice(0, MAX_LEN);
  const telefonDonator = String(formData.get("telefonDonator") ?? "").trim().slice(0, MAX_LEN);
  const mesaj = String(formData.get("mesaj") ?? "").trim().slice(0, MAX_MESAJ_LEN);
  const anonim = formData.get("anonim") != null;
  // Câmpul ascuns există mereu în formular (valoare "" = o singură dată, "1" =
  // lunar); verificarea `!= null` ar face din ORICE donație un abonament lunar.
  const recurenta = formData.get("recurenta") === "1";
  const consimtamantGdpr = formData.get("consimtamantGdpr") != null;
  const consimtamantTermeni = formData.get("consimtamantTermeni") != null;
  const consimtamantWhatsapp = formData.get("consimtamantWhatsapp") != null;

  if (!numeDonator || !emailDonator) {
    return { ok: false, error: errors.campuriObligatorii };
  }
  if (!EMAIL_RE.test(emailDonator)) {
    return { ok: false, error: errors.emailInvalid };
  }
  if (!consimtamantGdpr || !consimtamantTermeni) {
    return { ok: false, error: errors.acordObligatoriu };
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
    return { ok: false, error: errors.paginaNegasita };
  }

  // Donația se încasează în contul Stripe al ONG-ului (nu al platformei) — dacă
  // ONG-ul nu și-a conectat încă contul, nu există unde să trimitem plata.
  let stripeOrg: Awaited<ReturnType<typeof stripeOrgDupaSlug>>;
  try {
    stripeOrg = await stripeOrgDupaSlug(orgSlug);
  } catch (e) {
    console.error("cheia Stripe a organizației nu a putut fi citită:", e);
    return { ok: false, error: errors.stripeIndisponibil };
  }
  if (!stripeOrg) {
    return { ok: false, error: errors.stripeNeconectat };
  }

  return {
    ok: true,
    date: {
      suma,
      numeDonator,
      emailDonator,
      telefonDonator,
      mesaj,
      anonim,
      recurenta,
      consimtamantGdpr,
      consimtamantTermeni,
      consimtamantWhatsapp,
      orgId: rezolvat.orgId,
      pageId: rezolvat.pageId,
      titlu: rezolvat.titlu,
      stripeOrg,
    },
  };
}

export async function doneazaAction(
  orgSlug: string,
  pageSlug: string,
  _prevState: DoneazaState,
  formData: FormData,
): Promise<DoneazaState> {
  const errors = DONATE_ACTION_ERRORS[await getLocale()];

  // Honeypot — un bot completează orice câmp, un om nu-l vede.
  if (String(formData.get("website") ?? "").trim()) {
    return { error: null };
  }

  const pregatit = await pregatesteDonatie(orgSlug, pageSlug, formData, errors);
  if (!pregatit.ok) return { error: pregatit.error };
  const {
    suma,
    numeDonator,
    emailDonator,
    telefonDonator,
    mesaj,
    anonim,
    recurenta,
    consimtamantGdpr,
    consimtamantTermeni,
    consimtamantWhatsapp,
    orgId,
    pageId,
    titlu,
    stripeOrg,
  } = pregatit.date;

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
      pageId,
      orgId,
      numeDonator,
      emailDonator,
      telefonDonator,
      anonim: String(anonim),
      consimtamantGdpr: String(consimtamantGdpr),
      consimtamantTermeni: String(consimtamantTermeni),
      consimtamantWhatsapp: String(consimtamantWhatsapp),
    };

    const session = await stripeOrg.stripe.checkout.sessions.create({
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
            product_data: { name: titlu },
            unit_amount: suma * 100,
            ...(recurenta ? { recurring: { interval: "month" as const } } : {}),
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/strangere-fonduri/${orgSlug}/${pageSlug}/multumim?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/strangere-fonduri/${orgSlug}/${pageSlug}`,
      customer_email: emailDonator || undefined,
      metadata: { donationId, pageId, orgId },
      ...(recurenta ? { subscription_data: { metadata: metadataDonatie } } : {}),
    });
    if (!session.url) throw new Error("stripe_session_no_url");
    sessionUrl = session.url;

    // "anonim" ascunde numele DOAR pe afișarea publică (vezi page.tsx) —
    // numele/emailul/telefonul se salvează mereu, organizația are nevoie de
    // ele pentru relația cu donatorul, indiferent de vizibilitatea publică.
    await db.insert(fundraisingDonations).values({
      id: donationId,
      pageId,
      orgId,
      numeDonator,
      emailDonator,
      telefonDonator: telefonDonator || null,
      suma,
      mesaj: mesaj || null,
      anonim,
      consimtamantGdpr,
      consimtamantTermeni,
      consimtamantWhatsapp,
      stripeSessionId: session.id,
      recurenta,
    });
  } catch (e) {
    console.error("creare sesiune Stripe / donatie esuata:", e);
    return { error: errors.plataEsuata };
  }

  redirect(sessionUrl);
}
