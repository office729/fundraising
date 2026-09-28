"use client";

import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

// Alege un interval pentru KPI-ul echipei (prin ?de=&la=); fără interval = luna curentă.
export function PerioadaPicker({ de, la }: { de: string; la: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [d, setD] = useState(de);
  const [l, setL] = useState(la);

  const camp = "h-8 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 text-[12px] text-[var(--ci-text)]";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[12px] font-semibold text-[var(--ci-text-muted)]">Perioadă:</span>
      <input type="date" value={d} onChange={(e) => setD(e.target.value)} className={camp} />
      <span className="text-[12px] text-[var(--ci-text-faint)]">–</span>
      <input type="date" value={l} onChange={(e) => setL(e.target.value)} className={camp} />
      <button
        type="button"
        disabled={!d || !l}
        onClick={() => router.push(`${pathname}?de=${d}&la=${l}`)}
        className="h-8 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-3 text-[12px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Aplică
      </button>
      {(de || la) && (
        <button type="button" onClick={() => router.push(pathname)} className="text-[12px] font-medium text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]">
          Luna curentă
        </button>
      )}
    </div>
  );
}
