"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Spune paginii părinte (public/embed.js) cât de înalt e conținutul, ca iframe-ul să nu aibă bară de derulare proprie.
// Mesajul conține doar un număr; nu există nicio informație despre donator.
export function InaltimeAutomata({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.parent === window) return;
    const trimite = () => window.parent.postMessage({ type: "alexandrit:height", height: Math.ceil(el.getBoundingClientRect().height) }, "*");
    trimite();
    const ro = new ResizeObserver(trimite);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return <div ref={ref}>{children}</div>;
}
