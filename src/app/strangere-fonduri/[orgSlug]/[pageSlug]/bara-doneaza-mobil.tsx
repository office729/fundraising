"use client";

import { useEffect, useState } from "react";

// Pe telefon, butonul „Donează acum” e după titlu, butoanele de distribuire și cercul de progres — adică sub primul ecran. Un donator
// grăbit sau fără obișnuința paginilor lungi nu-l găsește. Bara de jos îl ține la îndemână până ajunge la cardul de donație.
export function BaraDoneazaMobil({ tintaId, eticheta }: { tintaId: string; eticheta: string }) {
  const [vizibila, setVizibila] = useState(false);

  useEffect(() => {
    const tinta = document.getElementById(tintaId);
    if (!tinta) return;
    const obs = new IntersectionObserver(([e]) => setVizibila(!e.isIntersecting), { threshold: 0.2 });
    obs.observe(tinta);
    return () => obs.disconnect();
  }, [tintaId]);

  return (
    <>
      <div aria-hidden className="h-20 sm:hidden" />
      <div
        className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-panel/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] backdrop-blur transition-transform duration-200 sm:hidden ${
          vizibila ? "translate-y-0" : "translate-y-full"
        }`}
        aria-hidden={!vizibila}
      >
        <button
          type="button"
          tabIndex={vizibila ? 0 : -1}
          onClick={() => document.getElementById(tintaId)?.scrollIntoView({ behavior: "smooth", block: "center" })}
          className="w-full rounded-lg bg-brand-green px-5 py-3 text-center text-[15px] font-bold text-white shadow-sm"
        >
          {eticheta}
        </button>
      </div>
    </>
  );
}
