"use client";

import { useState } from "react";

import { Card, CardHeader } from "../../components/ui/card";
import { useLocale } from "../../lib/locale-context";
import { FORMULAR230_DICT } from "@/lib/i18n/dictionaries/formular230";

type Rand = { id: string; nume: string; nrFormulare: number };

export function StatsChartCard({ beneficiari }: { beneficiari: Rand[] }) {
  const locale = useLocale();
  const dict = FORMULAR230_DICT[locale].statsChart;
  const [hover, setHover] = useState<string | null>(null);
  const sortate = [...beneficiari].sort((a, b) => b.nrFormulare - a.nrFormulare);
  const max = Math.max(1, ...sortate.map((b) => b.nrFormulare));

  return (
    <Card>
      <CardHeader title={dict.title} subtitle={dict.subtitle} />
      {sortate.length ? (
        <div className="mt-1 space-y-3">
          {sortate.map((b) => (
            <div
              key={b.id}
              className="group"
              onMouseEnter={() => setHover(b.id)}
              onMouseLeave={() => setHover((h) => (h === b.id ? null : h))}
            >
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="truncate text-[12.5px] font-medium text-[var(--ci-text)]">{b.nume}</span>
                <span className="ci-tabular shrink-0 text-[12.5px] font-semibold text-[var(--ci-text)]">{b.nrFormulare}</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
                <div
                  className="h-full rounded-full transition-[filter] duration-150"
                  style={{
                    width: `${Math.max(3, (b.nrFormulare / max) * 100)}%`,
                    backgroundColor: "var(--ci-primary)",
                    filter: hover === b.id ? "brightness(0.85)" : undefined,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.niciunCont}</p>
      )}
    </Card>
  );
}
