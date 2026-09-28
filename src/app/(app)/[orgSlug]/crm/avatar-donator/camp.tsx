"use client";

import { cloneElement, useId, type ReactElement } from "react";

// Câmp de formular cu eticheta legată de control (label + id), ca cititoarele de ecran să anunțe numele câmpului
// și ca un click pe etichetă să dea focus în câmp.
export function Camp({ label, children, className }: { label: string; children: ReactElement<{ id?: string }>; className?: string }) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-[var(--ci-text)]">
        {label}
      </label>
      {cloneElement(children, { id })}
    </div>
  );
}

// Chip cu totalul unui grup de procente: verde la 100%, galben sub, roșu peste; anunțat de cititoarele de ecran.
export function TotalProcente({ total }: { total: number }) {
  const t = Math.round(total);
  if (t === 0) return <span className="text-[12px] font-normal text-[var(--ci-text-muted)]">total 0% din 100%</span>;
  const cls = t === 100 ? "bg-[var(--ci-green-soft)] text-[var(--ci-green)]" : t > 100 ? "bg-[var(--ci-red-soft)] text-[var(--ci-red)]" : "bg-[var(--ci-amber-soft)] text-[var(--ci-text)]";
  const text = t === 100 ? "100% · complet" : t > 100 ? `${t}% · cu ${t - 100}% peste` : `${t}% din 100% · mai ai ${100 - t}%`;
  return (
    <span role="status" aria-live="polite" className={`ml-2 rounded-full px-2 py-0.5 text-[12px] font-semibold ${cls}`}>
      {text}
    </span>
  );
}
