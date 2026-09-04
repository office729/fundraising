"use client";

import { AlertTriangle, Heart, RotateCcw, Sparkles, Star, TrendingUp, UserPlus } from "lucide-react";

import { Badge, type StatusTone } from "../components/ui/badge";
import { Card, CardHeader } from "../components/ui/card";
import { formatSuma } from "../lib/format";
import { useDonatori } from "../lib/use-data";
import { useLocale } from "../lib/locale-context";
import { RFM_DICT } from "@/lib/i18n/dictionaries/rfm";
import type { SegmentDonator } from "../mock";

const SEGMENT_TONE: Record<SegmentDonator, StatusTone> = {
  nou: "blue", fidel: "green", major: "green", recurent: "blue",
  in_risc: "amber", inactiv: "neutral", reactivat: "purple",
};
const SEGMENT_ICON: Record<SegmentDonator, typeof Heart> = {
  nou: UserPlus, fidel: Heart, major: Star, recurent: RotateCcw,
  in_risc: AlertTriangle, inactiv: Sparkles, reactivat: TrendingUp,
};
// Ordinea contează: ce cere atenție urgentă primul, apoi ce e valoros de
// păstrat, apoi restul — nu ordinea alfabetică sau tehnică a scorului RFM.
const ORDINE: SegmentDonator[] = ["in_risc", "inactiv", "major", "fidel", "recurent", "reactivat", "nou"];

export default function RfmPage() {
  const DONATORI = useDonatori();
  const locale = useLocale();
  const dict = RFM_DICT[locale];
  const SEGMENT_LABEL = dict.segmentLabel;
  const SEGMENT_EXPLICATIE = dict.segmentExplicatie;
  const SEGMENT_RECOMANDARE = dict.segmentRecomandare;
  const distributie = ORDINE.map((s) => ({
    segment: s,
    count: DONATORI.filter((d) => d.segment === s).length,
    valoare: DONATORI.filter((d) => d.segment === s).reduce((sum, d) => sum + d.totalDonat, 0),
  }));
  const total = DONATORI.length || 1;
  const retentie = Math.round(
    (DONATORI.filter((d) => d.segment === "fidel" || d.segment === "recurent").length / total) * 100,
  );
  const inRisc = distributie.find((d) => d.segment === "in_risc")?.count ?? 0;
  const valoareMajori = distributie.find((d) => d.segment === "major")?.valoare ?? 0;

  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle(DONATORI.length)}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card><p className="text-[12px] text-[var(--ci-text-muted)]">{dict.stats.totalDonatori}</p><p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{DONATORI.length}</p></Card>
        <Card><p className="text-[12px] text-[var(--ci-text-muted)]">{dict.stats.rataRetentie}</p><p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-green)]">{retentie}%</p></Card>
        <Card><p className="text-[12px] text-[var(--ci-text-muted)]">{dict.stats.riscaSaIiPierdem}</p><p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-amber)]">{inRisc}</p></Card>
        <Card><p className="text-[12px] text-[var(--ci-text-muted)]">{dict.stats.valoareDonatoriMari}</p><p className="ci-tabular mt-1 text-xl font-bold text-[var(--ci-text)]">{formatSuma(valoareMajori)}</p></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {distributie.map((d) => {
          const Icon = SEGMENT_ICON[d.segment];
          const procent = Math.round((d.count / total) * 100);
          return (
            <Card key={d.segment}>
              <div className="flex items-start gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: `var(--ci-${SEGMENT_TONE[d.segment] === "neutral" ? "surface-2" : SEGMENT_TONE[d.segment] + "-soft"})` }}
                >
                  <Icon className="h-5 w-5" style={{ color: SEGMENT_TONE[d.segment] === "neutral" ? "var(--ci-text-muted)" : `var(--ci-${SEGMENT_TONE[d.segment]})` }} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[14px] font-semibold text-[var(--ci-text)]">{SEGMENT_LABEL[d.segment]}</p>
                    <Badge tone={SEGMENT_TONE[d.segment]} icon={false}>{d.count} · {procent}%</Badge>
                  </div>
                  <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">{SEGMENT_EXPLICATIE[d.segment]}</p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-lg bg-[var(--ci-surface-2)] px-3 py-2">
                <span className="text-[12px] text-[var(--ci-text-muted)]">{dict.sumaGrup}</span>
                <span className="ci-tabular text-[13px] font-semibold text-[var(--ci-text)]">{formatSuma(d.valoare)}</span>
              </div>

              <div className="mt-3 rounded-lg border border-[var(--ci-border)] px-3 py-2.5">
                <p className="text-[11px] font-semibold tracking-wide text-[var(--ci-text-faint)] uppercase">{dict.ceAiDeFacut}</p>
                <p className="mt-0.5 text-[13px] font-medium text-[var(--ci-text)]">{SEGMENT_RECOMANDARE[d.segment]}</p>
              </div>

              <button
                disabled={d.count === 0}
                className="mt-3 w-full rounded-lg border border-[var(--ci-border)] py-1.5 text-[12px] font-medium text-[var(--ci-text)] transition-colors hover:border-[var(--ci-primary)] hover:text-[var(--ci-primary)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {dict.creazaCampanie}
              </button>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader title={dict.distributie.title} subtitle={dict.distributie.subtitle} />
        <div className="space-y-2.5">
          {distributie.map((d) => {
            const procent = Math.round((d.count / total) * 100);
            return (
              <div key={d.segment} className="flex items-center gap-3">
                <span className="w-36 shrink-0 text-[12px] text-[var(--ci-text-muted)]">{SEGMENT_LABEL[d.segment]}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${procent}%`, background: SEGMENT_TONE[d.segment] === "neutral" ? "var(--ci-text-faint)" : `var(--ci-${SEGMENT_TONE[d.segment]})` }}
                  />
                </div>
                <span className="ci-tabular w-16 shrink-0 text-right text-[12px] font-medium text-[var(--ci-text)]">{d.count} ({procent}%)</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
