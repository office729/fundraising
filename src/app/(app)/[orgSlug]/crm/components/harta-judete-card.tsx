"use client";

import type { FC } from "react";
import { useMemo, useState } from "react";
import { RomaniaMap as RomaniaMapUntyped, type RomaniaMapReactProps } from "romania-map-kit/react";
import { createLinearColorScale, type RomaniaMapData } from "romania-map-kit/core";

import { JUDET_DUPA_COD } from "@/lib/judete";

// Pachetul declară RomaniaMap ca întorcând `unknown`, nu un element JSX valid — recastăm o singură dată
// (vezi și formular-230/romania-map-card.tsx).
const RomaniaMap = RomaniaMapUntyped as FC<RomaniaMapReactProps>;

// Harta României, compactă, pentru partea de sus a paginilor din CRM: harta în stânga, primele județe în dreapta.
export function HartaJudeteCard({
  dupaJudet,
  titlu,
  subtitlu,
  unitate,
  ariaLabel,
}: {
  dupaJudet: Record<string, number>;
  titlu: string;
  subtitlu: string;
  /** „firme”, „companii” … apare după număr în etichete. */
  unitate: string;
  ariaLabel: string;
}) {
  const [hover, setHover] = useState<{ nume: string; nr: number } | null>(null);

  const max = Math.max(1, ...Object.values(dupaJudet));
  const colorScale = useMemo(() => createLinearColorScale({ min: 0, max, from: "#b7cdea", to: "#0f3a6b", fallback: "#e6edf5" }), [max]);
  const data: RomaniaMapData = useMemo(() => Object.fromEntries(Object.entries(dupaJudet).map(([cod, nr]) => [cod, { value: nr }])), [dupaJudet]);

  const top = useMemo(
    () =>
      Object.entries(dupaJudet)
        .filter(([, nr]) => nr > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([cod, nr]) => ({ cod, nume: JUDET_DUPA_COD[cod] ?? cod, nr })),
    [dupaJudet],
  );
  const total = useMemo(() => Object.values(dupaJudet).reduce((s, n) => s + n, 0), [dupaJudet]);

  return (
    <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-[var(--ci-text)]">{titlu}</p>
          <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{subtitlu}</p>
        </div>
        <span
          className="ci-tabular rounded-full bg-[var(--ci-surface-2)] px-2.5 py-1 text-[12px] font-semibold text-[var(--ci-text-muted)]"
        >
          {`${total.toLocaleString("ro-RO")} ${unitate} cu județ`}
        </span>
      </div>
      <div className="mt-3 flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:gap-10">
        <div className="relative w-full max-w-[680px] lg:w-[58%] lg:shrink-0">
          <span
            className={`pointer-events-none absolute top-0 left-0 z-10 rounded-lg border px-3 py-1.5 text-[13px] font-semibold shadow-sm transition-opacity ${hover ? "border-[var(--ci-border)] bg-[var(--ci-surface)] text-[var(--ci-text)] opacity-100" : "opacity-0"}`}
            aria-hidden={!hover}
          >
            {hover ? `${hover.nume}: ${hover.nr.toLocaleString("ro-RO")} ${unitate}` : " "}
          </span>
          <div className="aspect-[4/3] w-full">
          <RomaniaMap
            data={data}
            colorScale={colorScale}
            defaultFill="#e6edf5"
            defaultStroke="#7b8aa0"
            strokeWidth={1.1}
            hoverFill="#dc2626"
            selectedFill="#dc2626"
            onCountyHover={(county) => setHover(county ? { nume: JUDET_DUPA_COD[county.id] ?? county.name, nr: dupaJudet[county.id] ?? 0 } : null)}
            ariaLabel={ariaLabel}
          />
          </div>
          <div className="mt-2 flex items-center justify-center gap-2 text-[11.5px] text-[var(--ci-text-muted)]">
            <span>mai puține</span>
            <span className="h-2 w-32 rounded-full" style={{ background: "linear-gradient(90deg, #b7cdea, #0f3a6b)" }} />
            <span>mai multe</span>
          </div>
        </div>
        <div className="w-full min-w-0 flex-1">
          {top.length === 0 ? (
            <p className="text-[13px] text-[var(--ci-text-muted)]">Nicio înregistrare cu județ completat încă.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {top.map((j) => (
                <li key={j.cod} className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="truncate font-medium text-[var(--ci-text)]">{j.nume}</span>
                    <span className="ci-tabular shrink-0 font-semibold text-[var(--ci-text)]">{j.nr.toLocaleString("ro-RO")}</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
                    <div className="h-full rounded-full bg-[var(--ci-primary)]" style={{ width: `${Math.max(4, Math.round((j.nr / max) * 100))}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
