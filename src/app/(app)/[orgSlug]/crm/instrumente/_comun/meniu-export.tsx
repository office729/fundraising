"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "../../components/ui/button";

export type ElementExport = { eticheta: string; descriere: string; icon: ReactNode; onClick: () => void };

// „Alte formate”: o listă de butoane obișnuite (nu un meniu ARIA fals): Tab merge printre ele, Escape închide și întoarce focusul pe buton,
// iar un click în afară închide. La deschidere, focusul trece pe primul element.
export function MeniuExport({ elemente, eticheta = "Alte formate" }: { elemente: ElementExport[]; eticheta?: string }) {
  const [deschis, setDeschis] = useState(false);
  const declansator = useRef<HTMLDivElement>(null);
  const panou = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (deschis) panou.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [deschis]);
  useEffect(() => {
    if (!deschis) return;
    const inchide = (e: MouseEvent) => {
      if (!declansator.current?.contains(e.target as Node)) setDeschis(false);
    };
    document.addEventListener("mousedown", inchide);
    return () => document.removeEventListener("mousedown", inchide);
  }, [deschis]);

  return (
    <div
      ref={declansator}
      className="relative"
      onKeyDown={(e) => {
        if (e.key === "Escape" && deschis) {
          setDeschis(false);
          declansator.current?.querySelector<HTMLButtonElement>("button")?.focus();
        }
      }}
    >
      <Button onClick={() => setDeschis((x) => !x)} aria-expanded={deschis} aria-haspopup="true">
        {eticheta} <ChevronDown className="size-4" aria-hidden />
      </Button>
      {deschis && (
        <div ref={panou} className="absolute right-0 z-20 mt-1.5 w-[min(18rem,86vw)] rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1.5 shadow-lg">
          {elemente.map((el) => (
            <button
              key={el.eticheta}
              type="button"
              onClick={() => {
                setDeschis(false);
                el.onClick();
              }}
              className="flex min-h-11 w-full items-start gap-2.5 rounded-[var(--ci-radius-btn)] px-2.5 py-2 text-left text-[13px] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
            >
              <span className="mt-0.5 shrink-0 text-[var(--ci-primary)]">{el.icon}</span>
              <span>
                <span className="font-semibold text-[var(--ci-text)]">{el.eticheta}</span>
                <span className="block text-[11.5px] text-[var(--ci-text-muted)]">{el.descriere}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
