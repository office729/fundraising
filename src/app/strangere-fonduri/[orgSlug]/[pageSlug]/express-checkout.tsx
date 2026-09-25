"use client";

import { Elements, ExpressCheckoutElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import type { Locale } from "@/lib/i18n/config";
import { DONATION_DICT } from "@/lib/i18n/dictionaries/donation";

import { creeazaIntentDonatieAction } from "./express-checkout-actions";

// Cache modul-nivel, cheiat pe cheia publicabilă — evită re-crearea instanței
// Stripe la fiecare randare, dar rămâne corect dacă utilizatorul navighează
// între paginile a două organizații diferite în aceeași sesiune SPA (fiecare
// ONG are propria cheie, niciodată una globală a platformei).
const stripePromiseCache = new Map<string, Promise<Stripe | null>>();
function getStripePromise(publishableKey: string): Promise<Stripe | null> {
  let promise = stripePromiseCache.get(publishableKey);
  if (!promise) {
    promise = loadStripe(publishableKey);
    stripePromiseCache.set(publishableKey, promise);
  }
  return promise;
}

function ExpressCheckoutInner({
  orgSlug,
  pageSlug,
  suma,
  formRef,
  onVisibilityChange,
  t,
}: {
  orgSlug: string;
  pageSlug: string;
  suma: number;
  formRef: React.RefObject<HTMLFormElement | null>;
  onVisibilityChange: (visibil: boolean) => void;
  t: (typeof DONATION_DICT)[Locale]["donateForm"];
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [eroare, setEroare] = useState<string | null>(null);
  const [sePlateste, setSePlateste] = useState(false);

  // Suma se schimbă (sumă rapidă aleasă sau tastată manual) după montare —
  // Elements nu preia automat noul `options.amount`, trebuie sincronizat
  // explicit, altfel portofelul ar arăta suma cu care a fost deschis prima
  // dată, nu suma curentă din formular.
  useEffect(() => {
    if (!elements || !Number.isFinite(suma) || suma < 5) return;
    elements.update({ amount: Math.round(suma * 100) });
  }, [elements, suma]);

  return (
    <div className="mt-1">
      <ExpressCheckoutElement
        // Implicit ('auto') Apple Pay / Google Pay apar doar dacă dispozitivul are
        // deja un card activ în portofel; cu 'always' apar oricui e pe o platformă
        // compatibilă (fără card, portofelul îl cere la click) — la fel ca pe
        // salveazaoinima.ro și fundatianektarios.ro. Link rămâne oprit: cere
        // propriul flux de autentificare, iar formularul obișnuit e deja alternativa.
        options={{
          paymentMethods: { applePay: "always", googlePay: "always", link: "never" },
          // Portofelul colectează singur email-ul și datele de facturare — donatorul
          // nu mai completează formularul ca să poată plăti.
          buttonType: { applePay: "donate", googlePay: "donate" },
          emailRequired: true,
          phoneNumberRequired: false,
          billingAddressRequired: true,
        }}
        onReady={({ availablePaymentMethods }) => onVisibilityChange(Boolean(availablePaymentMethods))}
        onClick={(event) => {
          // Portofelul se deschide direct: numele și email-ul vin din el (vezi
          // onConfirm), iar acordul pentru Termeni/GDPR e dat prin plată (text sub
          // buton). Singura verificare rămasă e suma, care e deja în formular.
          if (!Number.isFinite(suma) || suma < 5) {
            setEroare(t.plataExpressEsuata);
            event.reject();
            return;
          }
          setEroare(null);
          event.resolve();
        }}
        onConfirm={async (event) => {
          if (!stripe || !elements || !formRef.current) return;
          setSePlateste(true);
          setEroare(null);
          try {
            const { error: submitError } = await elements.submit();
            if (submitError) {
              setEroare(submitError.message ?? t.plataExpressEsuata);
              event.paymentFailed({ reason: "fail" });
              return;
            }

            const formData = new FormData(formRef.current);
            // Ce a completat donatorul în formular are prioritate; ce lipsește se
            // ia din portofel (nume, email, telefon).
            const din = event.billingDetails;
            const emailPortofel = (din?.email ?? "").trim();
            if (!String(formData.get("numeDonator") ?? "").trim()) {
              formData.set("numeDonator", (din?.name ?? "").trim() || emailPortofel.split("@")[0] || "Donator");
            }
            if (!String(formData.get("emailDonator") ?? "").trim()) formData.set("emailDonator", emailPortofel);
            if (!String(formData.get("telefonDonator") ?? "").trim() && din?.phone) formData.set("telefonDonator", din.phone);
            const rezultat = await creeazaIntentDonatieAction(orgSlug, pageSlug, formData);
            if (!rezultat.ok) {
              setEroare(rezultat.error);
              event.paymentFailed({ reason: "fail", message: rezultat.error });
              return;
            }

            const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
              elements,
              clientSecret: rezultat.clientSecret,
              confirmParams: {
                return_url: `${window.location.origin}/strangere-fonduri/${orgSlug}/${pageSlug}/multumim`,
              },
              redirect: "if_required",
            });

            if (confirmError) {
              setEroare(confirmError.message ?? t.plataExpressEsuata);
              event.paymentFailed({ reason: "fail", message: confirmError.message });
              return;
            }

            // Fără redirect (cazul obișnuit la Apple Pay/Google Pay) — Stripe
            // nu a navigat browserul, o facem noi. Statusul REAL al donației
            // (marcarea "reusita") rămâne exclusiv treaba webhook-ului,
            // niciodată a acestui răspuns client-side — vezi
            // stripe-donation-events.ts.
            if (paymentIntent) {
              router.push(
                `/strangere-fonduri/${orgSlug}/${pageSlug}/multumim?payment_intent=${encodeURIComponent(paymentIntent.id)}`,
              );
            }
          } finally {
            setSePlateste(false);
          }
        }}
      />
      {eroare && <p className="mt-2 text-sm text-red-600">{eroare}</p>}
      {sePlateste && <p className="mt-2 text-center text-xs text-muted-2">{t.sePregateste}</p>}
      <p className="mt-2 text-center text-[11px] text-muted-2">
        {t.plataRapidaAcordPre}{" "}
        <Link href="/termeni" target="_blank" className="underline">
          {t.acordTermeniLink}
        </Link>{" "}
        {t.plataRapidaAcordSi}{" "}
        <Link href="/gdpr" target="_blank" className="underline">
          {t.acordGdprLink}
        </Link>
        .
      </p>
      <p className="mt-1 text-center text-[11px] text-muted-2">{t.sauCompleteazaFormular}</p>
    </div>
  );
}

// Butoane native Apple Pay/Google Pay/PayPal (ce e activat pe contul Stripe
// al ONG-ului) direct în modalul de donație — alternativă rapidă la
// formularul complet de mai jos, care rămâne mereu funcțional ca variantă de
// bază. Funcționează și pentru donații lunare (Faza 2) — creează un abonament
// în loc de o plată unică, vezi express-checkout-actions.ts. Nu se randează
// deloc dacă ONG-ul n-are cheie publicabilă sau dacă niciun portofel nu e
// disponibil pe dispozitiv/browser.
export function ExpressCheckoutPanel({
  orgSlug,
  pageSlug,
  publishableKey,
  suma,
  recurenta,
  formRef,
  locale,
}: {
  orgSlug: string;
  pageSlug: string;
  publishableKey: string | null;
  suma: number;
  recurenta: boolean;
  formRef: React.RefObject<HTMLFormElement | null>;
  locale: Locale;
}) {
  const stripePromise = useMemo(() => (publishableKey ? getStripePromise(publishableKey) : null), [publishableKey]);
  if (!publishableKey || !stripePromise) return null;

  const mode = recurenta ? "subscription" : "payment";

  return (
    <ExpressCheckoutForMode
      // Stripe nu permite schimbarea mode-ului pe o instanță Elements deja
      // montată — key={mode} face ca React să remonteze tot subarborele curat
      // la comutarea O singură dată ↔ Lunar, inclusiv starea de vizibilitate
      // (pornește mereu de la `false`, nu rămâne cu valoarea mode-ului anterior).
      key={mode}
      mode={mode}
      stripePromise={stripePromise}
      orgSlug={orgSlug}
      pageSlug={pageSlug}
      suma={suma}
      formRef={formRef}
      locale={locale}
    />
  );
}

function ExpressCheckoutForMode({
  mode,
  stripePromise,
  orgSlug,
  pageSlug,
  suma,
  formRef,
  locale,
}: {
  mode: "payment" | "subscription";
  stripePromise: Promise<Stripe | null>;
  orgSlug: string;
  pageSlug: string;
  suma: number;
  formRef: React.RefObject<HTMLFormElement | null>;
  locale: Locale;
}) {
  const [vizibil, setVizibil] = useState(false);
  const t = DONATION_DICT[locale].donateForm;

  return (
    <div className={vizibil ? "flex flex-col gap-2" : "hidden"}>
      <p className="text-center text-xs font-medium text-muted-2">{t.sauPlatesteRapid}</p>
      <Elements stripe={stripePromise} options={{ mode, amount: Math.round(Math.max(suma, 5) * 100), currency: "ron" }}>
        <ExpressCheckoutInner
          orgSlug={orgSlug}
          pageSlug={pageSlug}
          suma={suma}
          formRef={formRef}
          onVisibilityChange={setVizibil}
          t={t}
        />
      </Elements>
    </div>
  );
}
