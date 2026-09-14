"use client";

import { useEffect, useRef, useState } from "react";

// Embed oficial Calendly (inline widget) — vezi
// https://calendly.com/help/how-to-embed-calendly-in-a-react-app. Nu folosim
// pachetul `react-calendly` (dependință în plus, nefolosită altundeva) — doar
// scriptul lor extern + `initInlineWidget`, apelat manual (nu ne bazăm pe
// scanarea automată `data-url` a scriptului, care nu se re-declanșează la o
// navigare client-side Next.js către un div montat ulterior).
declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (opts: { url: string; parentElement: HTMLElement; prefill?: Record<string, unknown> }) => void;
    };
  }
}

const CALENDLY_SCRIPT_SRC = "https://assets.calendly.com/assets/external/widget.js";

export function CalendlyInlineWidget({
  url,
  loadingLabel,
  className = "",
}: {
  url: string;
  loadingLabel: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function init() {
      if (cancelled || !containerRef.current || !window.Calendly) return;
      containerRef.current.innerHTML = "";
      window.Calendly.initInlineWidget({ url, parentElement: containerRef.current });
      setReady(true);
    }

    if (window.Calendly) {
      init();
      return;
    }

    let script = document.querySelector<HTMLScriptElement>(`script[src="${CALENDLY_SCRIPT_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = CALENDLY_SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
    script.addEventListener("load", init);

    return () => {
      cancelled = true;
      script?.removeEventListener("load", init);
    };
  }, [url]);

  return (
    <div className={`relative overflow-hidden rounded-2xl border border-line bg-white shadow-sm ${className}`}>
      {!ready && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-brand-green" />
          <p className="text-sm text-neutral-500">{loadingLabel}</p>
        </div>
      )}
      <div ref={containerRef} className="h-[700px] w-full min-w-[280px]" />
    </div>
  );
}
