"use client";

import { X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

const DURATA_MS = 6000;
// Cât așteptăm confirmarea (webhook Stripe): reîmprospătăm pagina din 3 în 3 secunde, cel mult 20 de ori (≈ 1 minut).
const INTERVAL_MS = 3000;
const INCERCARI_MAX = 20;

// Popup de mulțumire după o plată: apare peste pagina campaniei și se închide singur după câteva secunde (donatorul rămâne pe
// pagină, nu e dus altundeva). Se poate închide și cu X, Escape sau click în afara ferestrei. La închidere scoatem parametrii din
// adresă și reîmprospătăm pagina, ca totalul strâns să arate donația nou confirmată.
export function PopupMultumire({
  children,
  inchide,
  asteapta = false,
  intarziere,
}: {
  children: ReactNode;
  inchide: string;
  // true cât timp plata nu e confirmată: popup-ul nu se închide singur, ci reîmprospătează pagina până vine confirmarea.
  asteapta?: boolean;
  // Ce arătăm dacă confirmarea întârzie peste limită.
  intarziere?: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [deschis, setDeschis] = useState(true);
  const butonRef = useRef<HTMLButtonElement>(null);
  const [expirat, setExpirat] = useState(false);
  const sePoateInchideSingur = !asteapta || expirat;

  const inchideFereastra = useCallback(() => {
    setDeschis(false);
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  // Așteptăm confirmarea: reîmprospătăm datele paginii până când donația devine „reușită” (atunci `asteapta` devine false).
  useEffect(() => {
    if (!deschis || !asteapta || expirat) return;
    let incercari = 0;
    const interval = window.setInterval(() => {
      incercari += 1;
      if (incercari >= INCERCARI_MAX) {
        window.clearInterval(interval);
        setExpirat(true);
        return;
      }
      router.refresh();
    }, INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [deschis, asteapta, expirat, router]);

  useEffect(() => {
    if (!deschis) return;
    butonRef.current?.focus();
    if (!sePoateInchideSingur) {
      const laTastaAsteptare = (e: KeyboardEvent) => {
        if (e.key === "Escape") inchideFereastra();
      };
      window.addEventListener("keydown", laTastaAsteptare);
      return () => window.removeEventListener("keydown", laTastaAsteptare);
    }
    const timer = window.setTimeout(inchideFereastra, DURATA_MS);
    const laTasta = (e: KeyboardEvent) => {
      if (e.key === "Escape") inchideFereastra();
    };
    window.addEventListener("keydown", laTasta);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", laTasta);
    };
  }, [deschis, sePoateInchideSingur, inchideFereastra]);

  if (!deschis) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4" onClick={inchideFereastra}>
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-2xl bg-panel p-7 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={butonRef}
          type="button"
          onClick={inchideFereastra}
          aria-label={inchide}
          className="absolute top-3 right-3 rounded-full p-1.5 text-muted transition hover:bg-panel-2 hover:text-ink"
        >
          <X className="h-5 w-5" aria-hidden />
        </button>
        {asteapta && expirat && intarziere ? intarziere : children}
        {sePoateInchideSingur && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-panel-2" aria-hidden>
            <div className="h-full origin-left bg-brand-green" style={{ animation: `popup-multumire-bara ${DURATA_MS}ms linear forwards` }} />
          </div>
        )}
        <style>{`@keyframes popup-multumire-bara { from { transform: scaleX(1); } to { transform: scaleX(0); } } @media (prefers-reduced-motion: reduce) { [style*="popup-multumire-bara"] { animation: none !important; } }`}</style>
      </div>
    </div>
  );
}
