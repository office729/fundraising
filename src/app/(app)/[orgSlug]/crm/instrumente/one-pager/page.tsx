"use client";

import { Printer } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo } from "react";

import { Breadcrumb } from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { ProgressBar } from "../../components/ui/progress-bar";
import { formatSuma } from "../../lib/format";
import { useBeneficiari, useCompanii, useDonatori } from "../../lib/use-data";
import { useLocale } from "../../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";

export default function OnePagerPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const DONATORI = useDonatori();
  const COMPANII = useCompanii();
  const BENEFICIARI = useBeneficiari();
  const locale = useLocale();
  const dictRoot = INSTRUMENTE_DICT[locale];
  const dict = dictRoot.onePager;

  const stats = useMemo(() => {
    const totalDonat = DONATORI.reduce((s, d) => s + d.totalDonat, 0) + COMPANII.reduce((s, c) => s + c.sumaSponsorizata, 0);
    const cazuriActive = BENEFICIARI.filter((b) => b.statusCampanie !== "finalizata").length;
    const cazuriFinalizate = BENEFICIARI.filter((b) => b.statusCampanie === "finalizata").length;
    const companiiPartenere = COMPANII.filter((c) => c.status === "won").length;
    return { totalDonat, cazuriActive, cazuriFinalizate, companiiPartenere };
  }, [DONATORI, COMPANII, BENEFICIARI]);

  const topBeneficiari = [...BENEFICIARI].sort((a, b) => b.sumaStransa - a.sumaStransa).slice(0, 4);
  const topCompanii = [...COMPANII].filter((c) => c.sumaSponsorizata > 0).sort((a, b) => b.sumaSponsorizata - a.sumaSponsorizata).slice(0, 6);

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div className="flex items-center justify-between print:hidden">
        <Breadcrumb items={[{ label: dictRoot.breadcrumb, href: `/${orgSlug}/crm/instrumente` }, { label: dict.breadcrumbLabel }]} />
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="h-3.5 w-3.5" /> {dict.printeaza}
        </Button>
      </div>

      <Card className="space-y-6">
        <div className="text-center">
          <h1 className="ci-display text-2xl font-bold text-[var(--ci-text)]">{dict.titluOrg}</h1>
          <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitlu}</p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label={dict.totalStrans} value={formatSuma(stats.totalDonat)} />
          <Stat label={dict.cazuriActive} value={String(stats.cazuriActive)} />
          <Stat label={dict.cazuriFinalizate} value={String(stats.cazuriFinalizate)} />
          <Stat label={dict.companiiPartenere} value={String(stats.companiiPartenere)} />
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-[var(--ci-text)]">{dict.cazuriImpact}</p>
          <div className="grid grid-cols-2 gap-3">
            {topBeneficiari.map((b) => {
              const pct = Math.round((b.sumaStransa / b.obiectiv) * 100);
              return (
                <div key={b.id} className="rounded-lg border border-[var(--ci-border)] p-3">
                  <p className="text-[13px] font-medium text-[var(--ci-text)]">{b.nume}</p>
                  <p className="text-[12px] text-[var(--ci-text-muted)]">{b.localitate}</p>
                  <ProgressBar value={pct} className="mt-2" />
                  <p className="ci-tabular mt-1 text-[12px] text-[var(--ci-text-muted)]">{formatSuma(b.sumaStransa)} {dict.din} {formatSuma(b.obiectiv)}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[13px] font-semibold text-[var(--ci-text)]">{dict.parteneriCorporate}</p>
          <div className="flex flex-wrap gap-2">
            {topCompanii.map((c) => (
              <span key={c.id} className="rounded-full border border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-3 py-1 text-[12px] font-medium text-[var(--ci-text)]">
                {c.nume}
              </span>
            ))}
          </div>
        </div>

        <p className="text-center text-[11px] text-[var(--ci-text-faint)]">{dict.generatAutomat}</p>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="ci-tabular text-lg font-bold text-[var(--ci-text)]">{value}</p>
      <p className="text-[11px] text-[var(--ci-text-muted)]">{label}</p>
    </div>
  );
}
