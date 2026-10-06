"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Instrumentele HTML rulează într-un iframe care trebuie să încapă în ecran SUB antetul și bannerul organizației. Înălțimea
// acestora variază (pe telefon antetul trece pe mai multe rânduri, iar bannerul DPA apare doar uneori), deci un `h-screen`
// fix lăsa o parte din instrument sub pliu și producea două derulări suprapuse. Calculăm spațiul rămas din poziția reală.
const INALTIME_MINIMA = 480;

function potriveste(el: HTMLElement): () => void {
  const aplica = () => {
    const sus = el.getBoundingClientRect().top + window.scrollY;
    el.style.height = `${Math.max(INALTIME_MINIMA, window.innerHeight - sus)}px`;
    el.style.minHeight = "0";
  };
  aplica();
  window.addEventListener("resize", aplica);
  // Antetul se poate schimba după randare (banner, rânduri noi): reaplicăm când se schimbă înălțimea paginii.
  const obs = new ResizeObserver(aplica);
  obs.observe(document.body);
  return () => {
    window.removeEventListener("resize", aplica);
    obs.disconnect();
  };
}

// Container pentru instrumentele pe pagină întreagă (newsletter, one-pager).
export function ToolViewport({ className, children }: { className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => (ref.current ? potriveste(ref.current) : undefined), []);
  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

// Pentru instrumentele afișate în interiorul CRM-ului: ajustează containerul `.ci-root` al CRM-ului.
export function FitCrmShell() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const radacina = ref.current?.closest<HTMLElement>(".ci-root");
    return radacina ? potriveste(radacina) : undefined;
  }, []);
  return <span ref={ref} hidden />;
}
