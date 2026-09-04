"use client";

import type { FC } from "react";
import { useMemo, useState } from "react";
import { RomaniaMap as RomaniaMapUntyped, type RomaniaMapReactProps } from "romania-map-kit/react";
import { createLinearColorScale, type RomaniaMapData } from "romania-map-kit/core";

import { JUDET_DUPA_COD } from "@/lib/judete";
import { useLocale } from "../../lib/locale-context";
import { FORMULAR230_DICT } from "@/lib/i18n/dictionaries/formular230";

// Pachetul declară RomaniaMap ca întorcând `unknown`, nu un element JSX valid
// (vezi node_modules/romania-map-kit/dist/react/index.d.ts) — incompatibil cu
// tipizarea strictă de componente din React 19. Recastăm o singură dată aici.
const RomaniaMap = RomaniaMapUntyped as FC<RomaniaMapReactProps>;

export function RomaniaMapCard({ dupaJudet }: { dupaJudet: Record<string, number> }) {
  const locale = useLocale();
  const dict = FORMULAR230_DICT[locale].map;
  const [hover, setHover] = useState<{ id: string; nume: string; nr: number } | null>(null);

  const max = Math.max(1, ...Object.values(dupaJudet));
  const colorScale = useMemo(
    () => createLinearColorScale({ min: 0, max, from: "#eaf0f8", to: "#154a85", fallback: "#f1f5f9" }),
    [max],
  );
  const data: RomaniaMapData = useMemo(
    () => Object.fromEntries(Object.entries(dupaJudet).map(([cod, nr]) => [cod, { value: nr }])),
    [dupaJudet],
  );

  return (
    <div className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-semibold text-[var(--ci-text)]">{dict.title}</p>
          <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
        </div>
        {hover && (
          <span className="ci-tabular rounded-full bg-[var(--ci-primary-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--ci-primary)]">
            {hover.nume}: {hover.nr}
          </span>
        )}
      </div>
      <div className="mx-auto mt-3 aspect-[4/3] w-full max-w-2xl">
        <RomaniaMap
          data={data}
          colorScale={colorScale}
          defaultFill="#f1f5f9"
          defaultStroke="#cbd5e1"
          hoverFill="#dc2626"
          selectedFill="#dc2626"
          onCountyHover={(county) =>
            setHover(county ? { id: county.id, nume: JUDET_DUPA_COD[county.id] ?? county.name, nr: dupaJudet[county.id] ?? 0 } : null)
          }
          ariaLabel={dict.ariaLabel}
        />
      </div>
    </div>
  );
}
