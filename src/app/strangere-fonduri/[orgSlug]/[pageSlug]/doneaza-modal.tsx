"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { preconnect } from "react-dom";

import type { Locale } from "@/lib/i18n/config";
import { DONATION_DICT } from "@/lib/i18n/dictionaries/donation";

import { DoneazaForm } from "./doneaza-form";
import type { MetodeRedirect } from "@/lib/metode-plata-donatii";

const SELECTOR_FOCUSABIL =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Rând de metodă de plată pe pagină (logo + nume), ca pe fundatianektarios.ro.
function RandMetoda({ onClick, icon, text }: { onClick: () => void; icon: ReactNode; text: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg border border-line bg-panel px-3 py-2.5 text-left text-[13.5px] font-semibold text-ink transition hover:border-brand-blue hover:bg-panel-2"
    >
      {icon}
      {text}
    </button>
  );
}

// Butonul „Donează" deschide formularul într-un modal, în loc să stea
// îngropat mai jos pe pagină — mutat lângă titlu/poveste, ca prim CTA vizibil.
export function DoneazaModal({
  orgSlug,
  pageSlug,
  titlu,
  locale,
  publishableKey,
  metode,
}: {
  orgSlug: string;
  pageSlug: string;
  titlu: string;
  locale: Locale;
  publishableKey: string | null;
  // Calculat pe server la randarea paginii (vezi metode-plata-donatii.ts).
  metode: MetodeRedirect;
}) {
  // Conexiunile către Stripe se deschid din timp (DNS + TLS economisesc sute de ms
  // la prima inițializare a butoanelor Apple Pay / Google Pay).
  if (publishableKey) {
    preconnect("https://js.stripe.com", { crossOrigin: "anonymous" });
    preconnect("https://api.stripe.com", { crossOrigin: "anonymous" });
    preconnect("https://m.stripe.network", { crossOrigin: "anonymous" });
  }
  const [open, setOpen] = useState(false);
  // Metoda aleasă: Revolut / Google Pay / Apple Pay deschid un modal dedicat (ca pe
  // Nektarios); fără metodă, formularul obișnuit (card, pagina găzduită de Stripe).
  const [metoda, setMetoda] = useState<"revolut" | "gpay" | "apay" | "paypal" | undefined>(undefined);
  // Rândurile Revolut / PayPal apar doar dacă metodele sunt pornite în contul Stripe al ONG-ului.
  const revolutDisponibil = metode.revolut;
  const paypal = { ok: metode.paypal, curs: metode.cursEur };
  const t = DONATION_DICT[locale].donateModal;
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Semantică de dialog modal (WAI-ARIA Dialog pattern) — fără ea, un
  // utilizator de screen reader nu afla că s-a deschis un dialog, iar
  // tastatura putea "scăpa" pe conținutul din spate. La deschidere: focusul
  // intră în dialog (pe primul element focusabil) și rămâne prins înăuntru
  // (Tab/Shift+Tab ciclează doar prin dialog); la închidere: focusul revine
  // exact pe butonul "Donează acum" care l-a deschis.
  useEffect(() => {
    if (!open) return;
    const dialogEl = dialogRef.current;
    const triggerEl = triggerRef.current;
    const anteriorFocalizat = (document.activeElement as HTMLElement | null) ?? triggerEl;

    const primulFocusabil = dialogEl?.querySelector<HTMLElement>(SELECTOR_FOCUSABIL);
    (primulFocusabil ?? dialogEl)?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        return;
      }
      if (e.key !== "Tab" || !dialogEl) return;
      const focusabile = Array.from(dialogEl.querySelectorAll<HTMLElement>(SELECTOR_FOCUSABIL)).filter(
        (el) => el.offsetParent !== null,
      );
      if (focusabile.length === 0) return;
      const primul = focusabile[0];
      const ultimul = focusabile[focusabile.length - 1];
      if (e.shiftKey && document.activeElement === primul) {
        e.preventDefault();
        ultimul.focus();
      } else if (!e.shiftKey && document.activeElement === ultimul) {
        e.preventDefault();
        primul.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      anteriorFocalizat?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          setMetoda(undefined);
          setOpen(true);
        }}
        className="w-full rounded-lg bg-brand-green px-5 py-2.5 text-center text-[13.5px] font-bold text-white shadow-sm transition hover:bg-brand-green-hover hover:shadow-md"
      >
        {t.donezaAcum}
      </button>

      {publishableKey && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-center text-[11.5px] font-medium text-muted-2">{t.sauDonezaCu}</p>
          <RandMetoda
            onClick={() => {
              setMetoda("gpay");
              setOpen(true);
            }}
            icon={
              <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-white text-sm font-bold text-[#4285F4]">
                G
              </span>
            }
            text="Google Pay"
          />
          <RandMetoda
            onClick={() => {
              setMetoda("apay");
              setOpen(true);
            }}
            icon={
              <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-md bg-black text-white">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                  <path d="M16.37 12.63c-.02-2.17 1.77-3.21 1.85-3.26-1.01-1.47-2.58-1.67-3.14-1.7-1.34-.13-2.6.79-3.28.79-.68 0-1.72-.77-2.83-.75-1.46.02-2.8.85-3.55 2.16-1.51 2.62-.39 6.5 1.09 8.63.72 1.04 1.58 2.21 2.71 2.17 1.09-.04 1.5-.7 2.82-.7 1.31 0 1.68.7 2.83.68 1.17-.02 1.91-1.06 2.62-2.11.83-1.21 1.17-2.38 1.19-2.44-.03-.01-2.28-.87-2.31-3.47zM14.2 6.22c.6-.73 1-1.74.89-2.75-.86.03-1.9.57-2.52 1.3-.55.64-1.04 1.67-.91 2.66.96.07 1.94-.49 2.54-1.21z" />
                </svg>
              </span>
            }
            text="Apple Pay"
          />
          {paypal.ok && (
            <RandMetoda
              onClick={() => {
                setMetoda("paypal");
                setOpen(true);
              }}
              icon={
                <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-md bg-[#003087] text-sm font-bold italic text-[#009CDE]">
                  P
                </span>
              }
              text="PayPal"
            />
          )}
          {revolutDisponibil && (
            <RandMetoda
              onClick={() => {
                setMetoda("revolut");
                setOpen(true);
              }}
              icon={
                <span aria-hidden className="flex h-7 w-7 items-center justify-center rounded-md bg-black text-sm font-bold text-white">
                  R
                </span>
              }
              text="Revolut"
            />
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8" onClick={() => setOpen(false)}>
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="doneaza-modal-titlu"
            tabIndex={-1}
            className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-xl outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 id="doneaza-modal-titlu" className="font-display text-base font-bold text-ink">
                {metoda === "revolut"
                  ? t.donezaCuRevolut
                  : metoda === "gpay"
                    ? t.donezaCuGoogle
                    : metoda === "apay"
                      ? t.donezaCuApple
                      : metoda === "paypal"
                        ? t.donezaCuPaypal
                        : t.donezaPentru(titlu)}
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.inchide}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-2 hover:bg-panel-2"
              >
                ✕
              </button>
            </div>
            <DoneazaForm orgSlug={orgSlug} pageSlug={pageSlug} titlu={titlu} locale={locale} publishableKey={publishableKey} metoda={metoda} cursEur={paypal.curs} key={metoda ?? "card"} />
          </div>
        </div>
      )}
    </>
  );
}
