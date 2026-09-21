import Link from "next/link";

import type { Locale } from "@/lib/i18n/config";
import { calculeazaScor, type ScorInput } from "@/lib/scor-companie";

import { Card } from "../../components/ui/card";

const TEXT = {
  ro: {
    titlu: "Scor SOI — cât de potrivită e de abordat",
    top: "Top firme →",
    linii: { capacitate: "Capacitate D177 + 20%", marime: "Mărime & profitabilitate", relatie: "Relație / oportunitate", contact: "Are contact / decident", moment: "Moment potrivit" },
    prioritate: { ridicata: "PRIORITATE RIDICATĂ", medie: "PRIORITATE MEDIE", scazuta: "PRIORITATE SCĂZUTĂ" },
  },
  en: {
    titlu: "SOI score — how suitable it is to approach",
    top: "Top companies →",
    linii: { capacitate: "D177 + 20% capacity", marime: "Size & profitability", relatie: "Relationship / opportunity", contact: "Has contact / decision-maker", moment: "Right timing" },
    prioritate: { ridicata: "HIGH PRIORITY", medie: "MEDIUM PRIORITY", scazuta: "LOW PRIORITY" },
  },
} as const;

const CULOARE = { ridicata: "var(--ci-green)", medie: "var(--ci-amber)", scazuta: "var(--ci-text-faint)" } as const;
const FUNDAL = { ridicata: "var(--ci-green-soft)", medie: "var(--ci-amber-soft)", scazuta: "var(--ci-surface-2)" } as const;

export function ScorCard({ input, base, locale }: { input: ScorInput; base: string; locale: Locale }) {
  const t = TEXT[locale];
  const { total, linii, prioritate } = calculeazaScor(input);
  return (
    <Card>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex shrink-0 flex-col items-center gap-2 sm:w-[150px]">
          <div className="flex h-[92px] w-[92px] items-center justify-center rounded-2xl" style={{ background: FUNDAL[prioritate] }}>
            <span className="ci-tabular text-[38px] font-extrabold" style={{ color: CULOARE[prioritate] }}>
              {total}
            </span>
          </div>
          <span className="text-center text-[11px] font-extrabold tracking-wide" style={{ color: CULOARE[prioritate] }}>
            {t.prioritate[prioritate]}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{t.titlu}</h2>
            <Link href={`${base}/companii`} className="shrink-0 text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
              {t.top}
            </Link>
          </div>
          <div className="mt-3 flex flex-col gap-2.5">
            {linii.map((l) => (
              <div key={l.cheie} className="grid grid-cols-[minmax(0,150px)_1fr_auto] items-center gap-3 sm:grid-cols-[minmax(0,210px)_1fr_auto_minmax(0,260px)]">
                <span className="truncate text-[13px] text-[var(--ci-text-muted)]">{t.linii[l.cheie]}</span>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
                  <div className="h-full rounded-full" style={{ width: `${(l.puncte / l.max) * 100}%`, background: "var(--ci-green)" }} />
                </div>
                <span className="ci-tabular text-[13px] font-bold text-[var(--ci-text)]">
                  {l.puncte}/{l.max}
                </span>
                <span className="hidden truncate text-[12px] text-[var(--ci-text-faint)] sm:block">{l.detaliu}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
