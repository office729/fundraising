"use client";

import { Printer } from "lucide-react";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import type { ReactNode } from "react";

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

      <Card padded={false} className="overflow-hidden">
        <div className="bg-[var(--ci-primary)] px-8 py-10 text-center text-white print:py-8">
          <p className="text-[11px] font-bold tracking-[2.5px] text-white/70 uppercase">{dict.eyebrow}</p>
          <h1 className="ci-display mt-2 text-[28px] font-bold">{dict.titluOrg}</h1>
          <p className="mt-2 text-[13px] text-white/85">{dict.subtitlu}</p>
        </div>

        <div className="space-y-8 p-8">
          <div>
            <SectionLabel>{dict.impactLabel}</SectionLabel>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label={dict.totalStrans} value={formatSuma(stats.totalDonat)} />
              <Stat label={dict.cazuriActive} value={String(stats.cazuriActive)} />
              <Stat label={dict.cazuriFinalizate} value={String(stats.cazuriFinalizate)} />
              <Stat label={dict.companiiPartenere} value={String(stats.companiiPartenere)} />
            </div>
          </div>

          <div>
            <SectionLabel>{dict.cazuriImpact}</SectionLabel>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {topBeneficiari.map((b) => {
                const pct = Math.round((b.sumaStransa / b.obiectiv) * 100);
                return (
                  <div key={b.id} className="overflow-hidden rounded-[var(--ci-radius-card)] border border-[var(--ci-border)]">
                    <div className="h-1 bg-[var(--ci-primary)]" />
                    <div className="p-3">
                      <p className="text-[13px] font-medium text-[var(--ci-text)]">{b.nume}</p>
                      <p className="text-[12px] text-[var(--ci-text-muted)]">{b.localitate}</p>
                      <ProgressBar value={pct} className="mt-2" />
                      <p className="ci-tabular mt-1 text-[12px] text-[var(--ci-text-muted)]">{formatSuma(b.sumaStransa)} {dict.din} {formatSuma(b.obiectiv)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <SectionLabel>{dict.parteneriCorporate}</SectionLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {topCompanii.map((c) => (
                <span key={c.id} className="rounded-full border border-[var(--ci-primary)]/25 bg-[var(--ci-primary-soft)] px-3 py-1 text-[12px] font-medium text-[var(--ci-primary)]">
                  {c.nume}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-8 py-4 text-center">
          <p className="text-[12px] font-medium text-[var(--ci-text-muted)]">{dict.site}</p>
          <p className="mt-1 text-[11px] text-[var(--ci-text-faint)]">{dict.generatAutomat}</p>
        </div>
      </Card>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[11px] font-bold tracking-[1.5px] text-[var(--ci-primary)] uppercase">{children}</p>;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--ci-radius-card)] bg-[var(--ci-primary-soft)] px-2 py-4 text-center">
      <p className="ci-tabular text-xl font-bold text-[var(--ci-primary)]">{value}</p>
      <p className="mt-0.5 text-[11px] text-[var(--ci-text-muted)]">{label}</p>
    </div>
  );
}
