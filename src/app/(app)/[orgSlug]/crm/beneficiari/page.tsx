"use client";

import { Archive, ChevronDown } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "../components/ui/badge";
import { ProgressBar } from "../components/ui/progress-bar";
import { formatSuma } from "../lib/format";
import { useBeneficiari } from "../lib/use-data";
import { useLocale } from "../lib/locale-context";
import { BENEFICIARI_DICT } from "@/lib/i18n/dictionaries/beneficiari";

export default function BeneficiariPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const BENEFICIARI = useBeneficiari();
  const locale = useLocale();
  const dict = BENEFICIARI_DICT[locale].lista;
  const [arhivaDeschisa, setArhivaDeschisa] = useState(false);
  const active = BENEFICIARI.filter((b) => b.statusCampanie !== "finalizata");
  const arhivate = BENEFICIARI.filter((b) => b.statusCampanie === "finalizata");

  function card(b: (typeof BENEFICIARI)[number]) {
          const pct = Math.round((b.sumaStransa / b.obiectiv) * 100);
          return (
            <button
              key={b.id}
              onClick={() => router.push(`/${orgSlug}/crm/beneficiari/${b.id}`)}
              className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4 text-left shadow-[var(--ci-card-shadow)] transition-shadow hover:shadow-[var(--ci-shadow-md)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--ci-text)]">{b.nume}</p>
                <Badge tone={b.statusCampanie === "urgenta" ? "red" : b.statusCampanie === "finalizata" ? "green" : "blue"}>
                  {b.statusCampanie}
                </Badge>
              </div>
              <p className="text-[12px] text-[var(--ci-text-muted)]">{dict.varstaLocalitate(b.varsta, b.localitate)}</p>
              <ProgressBar value={pct} className="mt-3" />
              <div className="mt-2 flex items-center justify-between text-[12px] text-[var(--ci-text-muted)]">
                <span className="ci-tabular">{formatSuma(b.sumaStransa)}</span>
                <span className="ci-tabular font-medium text-[var(--ci-text)]">{pct}%</span>
              </div>
            </button>
          );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle(active.length)}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {active.map(card)}
      </div>

      <section className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
        <button
          type="button"
          onClick={() => setArhivaDeschisa((v) => !v)}
          aria-expanded={arhivaDeschisa}
          className="flex w-full items-center gap-2 px-4 py-3 text-left"
        >
          <Archive className="h-4 w-4 text-[var(--ci-text-muted)]" />
          <span className="text-sm font-semibold text-[var(--ci-text)]">{dict.arhiva}</span>
          <span className="ci-tabular rounded-full bg-[var(--ci-surface-2)] px-2 py-0.5 text-[11px] font-semibold text-[var(--ci-text-muted)]">{arhivate.length}</span>
          <span className="ml-1 hidden text-[12px] text-[var(--ci-text-muted)] sm:inline">{dict.arhivaDescriere}</span>
          <ChevronDown className={`ml-auto h-4 w-4 text-[var(--ci-text-muted)] transition-transform ${arhivaDeschisa ? "rotate-180" : ""}`} />
        </button>
        {arhivaDeschisa && (
          <div className="border-t border-[var(--ci-border)] p-4">
            {arhivate.length === 0 ? (
              <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.arhivaGoala}</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{arhivate.map(card)}</div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
