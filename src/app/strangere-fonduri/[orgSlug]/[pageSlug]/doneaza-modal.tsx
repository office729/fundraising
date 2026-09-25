"use client";

import { useEffect, useRef, useState } from "react";

import type { Locale } from "@/lib/i18n/config";
import { DONATION_DICT } from "@/lib/i18n/dictionaries/donation";

import { DoneazaForm } from "./doneaza-form";

const SELECTOR_FOCUSABIL =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Butonul „Donează" deschide formularul într-un modal, în loc să stea
// îngropat mai jos pe pagină — mutat lângă titlu/poveste, ca prim CTA vizibil.
export function DoneazaModal({
  orgSlug,
  pageSlug,
  titlu,
  locale,
  publishableKey,
}: {
  orgSlug: string;
  pageSlug: string;
  titlu: string;
  locale: Locale;
  publishableKey: string | null;
}) {
  const [open, setOpen] = useState(false);
  // Modalul e montat în fundal (invizibil) după încărcarea paginii, ca iframe-urile
  // Stripe ale butoanelor Apple/Google Pay să fie gata înainte de primul click —
  // altfel se creează abia la „Donează acum" și butoanele apar după câteva secunde.
  const [pregatit, setPregatit] = useState(false);
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
    // Fără cheie publicabilă nu există butoane rapide de pregătit.
    if (!publishableKey) return;
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(() => setPregatit(true), { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(() => setPregatit(true), 1500);
    return () => window.clearTimeout(id);
  }, [publishableKey]);

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
        onClick={() => setOpen(true)}
        // Intenția de a dona (mouse/atingere/tastatură) pornește pregătirea imediat.
        onPointerEnter={() => setPregatit(true)}
        onTouchStart={() => setPregatit(true)}
        onFocus={() => setPregatit(true)}
        className="w-full rounded-lg bg-brand-green px-5 py-2.5 text-center text-[13.5px] font-bold text-white shadow-sm transition hover:bg-brand-green-hover hover:shadow-md"
      >
        {t.donezaAcum}
      </button>

      {(open || pregatit) && (
        <div
          className={
            open
              ? "fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8"
              : // Închis dar montat: în afara ecranului, dar cu dimensiuni reale (Stripe
                // își măsoară containerul), fără interacțiune și ascuns cititoarelor de ecran.
                "pointer-events-none fixed inset-x-0 top-0 -z-10 flex -translate-y-[200vh] items-start justify-center px-4 py-8 opacity-0"
          }
          inert={!open}
          aria-hidden={!open}
          onClick={() => setOpen(false)}
        >
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
                {t.donezaPentru(titlu)}
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
            <DoneazaForm orgSlug={orgSlug} pageSlug={pageSlug} titlu={titlu} locale={locale} publishableKey={publishableKey} />
          </div>
        </div>
      )}
    </>
  );
}
