"use client";

import { Elements, ExpressCheckoutElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
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
        onReady={({ availablePaymentMethods }) => onVisibilityChange(Boolean(availablePaymentMethods))}
        onClick={(event) => {
          // Reutilizează validarea HTML5 nativă deja prezentă pe formular
          // (name/email/GDPR/Termeni sunt `required`) — dacă lipsește ceva,
          // browserul arată bula standard de validare pe câmpul respectiv, în
          // loc să deschidem portofelul pe un formular incomplet.
          if (formRef.current && !formRef.current.reportValidity()) {
            event.reject();
            return;
          }
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
      <p className="mt-2 text-center text-[11px] text-muted-2">{t.sauCompleteazaFormular}</p>
    </div>
  );
}

// Butoane native Apple Pay/Google Pay/PayPal (ce e activat pe contul Stripe
// al ONG-ului) direct în modalul de donație — alternativă rapidă la
// formularul complet de mai jos, care rămâne mereu funcțional ca variantă de
// bază. Nu se randează deloc dacă ONG-ul n-are cheie publicabilă, dacă
// donatorul a ales "Lunar" (Faza 1 acoperă doar donații unice), sau dacă
// niciun portofel nu e disponibil pe dispozitiv/browser.
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
  const [vizibil, setVizibil] = useState(false);
  const stripePromise = useMemo(() => (publishableKey ? getStripePromise(publishableKey) : null), [publishableKey]);
  const t = DONATION_DICT[locale].donateForm;

  if (!publishableKey || !stripePromise || recurenta) return null;

  return (
    <div className={vizibil ? "flex flex-col gap-2" : "hidden"}>
      <p className="text-center text-xs font-medium text-muted-2">{t.sauPlatesteRapid}</p>
      <Elements stripe={stripePromise} options={{ mode: "payment", amount: Math.round(Math.max(suma, 5) * 100), currency: "ron" }}>
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
