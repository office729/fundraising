"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Pe ecran tactil nu există „hover": o atingere deschide indicația și o închide singură după câteva secunde.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => setOpen(false), 4000);
    return () => window.clearTimeout(t);
  }, [open]);
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onPointerDown={(e) => {
        if (e.pointerType === "touch") setOpen((v) => !v);
      }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      {open && (
        <span
          role="tooltip"
          className="absolute bottom-full left-1/2 z-50 mb-2 w-max max-w-[min(14rem,calc(100vw-2rem))] -translate-x-1/2 rounded-lg bg-[var(--ci-text)] px-2.5 py-1.5 text-center text-[12px] leading-snug text-white shadow-[var(--ci-shadow-md)]"
        >
          {label}
        </span>
      )}
    </span>
  );
}
