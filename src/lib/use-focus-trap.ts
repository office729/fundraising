"use client";

import { useEffect, useRef, type RefObject } from "react";

const SELECTOR_FOCUSABIL =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Dialog modal accesibil (WAI-ARIA Dialog pattern): la deschidere focusul intră în dialog, Tab/Shift+Tab ciclează doar prin
// el, Esc îl închide, iar la închidere focusul revine pe elementul care îl deschisese. Fără asta, utilizatorul de tastatură
// „scăpa" pe conținutul din spate.
export function useFocusTrap(open: boolean, ref: RefObject<HTMLElement | null>, onClose: () => void) {
  // `onClose` ajunge de obicei ca funcție inline (nouă la fiecare randare): dacă ar fi dependență a efectului, la fiecare
  // tastă scrisă într-un câmp efectul ar rula iar și focusul ar sări la primul câmp. Se citește din ref, la apel.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const el = ref.current;
    const anterior = document.activeElement as HTMLElement | null;
    const vizibile = () =>
      el ? Array.from(el.querySelectorAll<HTMLElement>(SELECTOR_FOCUSABIL)).filter((x) => x.offsetParent !== null) : [];
    // Focus inițial pe PRIMUL câmp de formular, altfel pe primul element focusabil, altfel pe dialogul însuși.
    // Pe ecran tactil focusul pe un câmp ridică tastatura din prima și acoperă jumătate din dialog: acolo focusul intră
    // pe dialogul însuși (cititoarele de ecran tot îl anunță), iar câmpul se alege cu degetul.
    const tactil = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    const camp = tactil ? null : el?.querySelector<HTMLElement>("input:not([disabled]), textarea:not([disabled]), select:not([disabled])");
    (camp ?? (tactil ? el : vizibile()[0]) ?? el)?.focus({ preventScroll: true });
    // Pagina din spate nu mai derulează cât timp dialogul e deschis (pe telefon, derularea „scăpa" pe fundal).
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const f = vizibile();
      if (f.length === 0) return;
      const primul = f[0];
      const ultimul = f[f.length - 1];
      if (e.shiftKey && document.activeElement === primul) {
        e.preventDefault();
        ultimul.focus();
      } else if (!e.shiftKey && document.activeElement === ultimul) {
        e.preventDefault();
        primul.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflowAnterior;
      anterior?.focus?.();
    };
  }, [open, ref]);
}
