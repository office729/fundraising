import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { CAMPAIGN_TEMPLATES } from "@/lib/campaign-templates";

import { Badge } from "../ui/badge";
import { ProgressBar } from "../ui/progress-bar";
import { formatDataRelativa, formatSuma } from "../../lib/format";
import { ChapterHeader } from "./chapter-header";
import type { DashboardData } from "./types";

const PRIORITATE_TONE = { mare: "red", medie: "amber", mica: "neutral" } as const;

// Familia elegant-editorial (Cultură) — layout asimetric tip revistă: un
// proiect "vedetă" mare pe coloana din stânga (2/3), restul informației
// comprimat într-o coloană îngustă din dreapta (1/3), titluri de secțiune
// tip "capitol" (ChapterHeader) în loc de CardHeader boxat.
export function ElegantEditorialDashboard({
  base,
  dict,
  domeniu,
  kpis,
  actiuni,
  pipeline,
  inLucruPipeline,
  campaniiActive,
  apeluriReale,
  prioritateLabels,
}: DashboardData) {
  const itemLabel = domeniu ? CAMPAIGN_TEMPLATES[domeniu].itemLabel : undefined;
  const sorted = [...campaniiActive].sort(
    (a, b) => b.sumaStransa / b.obiectiv - a.sumaStransa / a.obiectiv,
  );
  const vedeta = sorted[0];
  const restul = sorted.slice(1);

  return (
    <div className="grid grid-cols-1 gap-x-10 gap-y-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <ChapterHeader
          eyebrow="Poveste principală"
          title={itemLabel ?? dict.proiecte.title}
          action={
            <Link href={`${base}/beneficiari`} className="text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
              {dict.proiecte.seeAll}
            </Link>
          }
        />

        {vedeta && (
          <Link href={`${base}/beneficiari/${vedeta.id}`} className="mb-8 block">
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 className="ci-display text-2xl font-semibold text-[var(--ci-text)]">{vedeta.nume}</h2>
              <Badge tone={vedeta.statusCampanie === "urgenta" ? "red" : "blue"}>
                {vedeta.statusCampanie === "urgenta" ? dict.proiecte.urgenta : dict.proiecte.activa}
              </Badge>
            </div>
            <ProgressBar value={Math.round((vedeta.sumaStransa / vedeta.obiectiv) * 100)} className="h-2" />
            <div className="mt-2 flex items-center justify-between text-[13px] text-[var(--ci-text-muted)]">
              <span className="ci-tabular">
                {formatSuma(vedeta.sumaStransa)} {dict.proiecte.din} {formatSuma(vedeta.obiectiv)}
              </span>
              <span className="ci-tabular font-medium text-[var(--ci-primary)]">
                {Math.round((vedeta.sumaStransa / vedeta.obiectiv) * 100)}%
              </span>
            </div>
            <p className="mt-1 text-[13px] text-[var(--ci-text-faint)]">{dict.proiecte.zileActive(vedeta.zileActive)}</p>
          </Link>
        )}

        {restul.length > 0 && (
          <div className="divide-y divide-[var(--ci-border)] border-t border-[var(--ci-border)]">
            {restul.map((b) => {
              const pct = Math.round((b.sumaStransa / b.obiectiv) * 100);
              return (
                <Link key={b.id} href={`${base}/beneficiari/${b.id}`} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-medium text-[var(--ci-text)]">{b.nume}</p>
                    <p className="text-[12px] text-[var(--ci-text-muted)]">{formatSuma(b.sumaStransa)} {dict.proiecte.din} {formatSuma(b.obiectiv)}</p>
                  </div>
                  <span className="ci-tabular shrink-0 text-[13px] font-medium text-[var(--ci-text)]">{pct}%</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-8">
        <div>
          <ChapterHeader eyebrow="Cifre" title={dict.donationChart.title} />
          <div className="space-y-3">
            {kpis.map((k) => (
              <div key={k.key} className="flex items-center justify-between">
                <span className="text-[13px] text-[var(--ci-text-muted)]">{k.label}</span>
                <span className="ci-tabular text-[14px] font-semibold text-[var(--ci-text)]">
                  {k.unitate === "count" ? Math.round(k.valoare) : k.unitate === "percent" ? `${Math.round(k.valoare)}%` : formatSuma(k.valoare)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <ChapterHeader eyebrow="Priorități" title={dict.actionCenter.title} />
          <div className="space-y-3">
            {actiuni.map((a) => (
              <div key={a.id} className="flex items-start gap-2">
                <Badge tone={PRIORITATE_TONE[a.prioritate]} icon={false}>
                  {prioritateLabels[a.prioritate]}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] text-[var(--ci-text)]">{a.motiv}</p>
                  <Link href={`${base}/${a.href}`} className="inline-flex items-center gap-0.5 text-[11px] font-medium text-[var(--ci-primary)] hover:underline">
                    {dict.actionCenter.resolve} <ArrowRight className="h-2.5 w-2.5" />
                  </Link>
                  <span className="ml-1.5 text-[11px] text-[var(--ci-text-faint)]">· {formatDataRelativa(a.termen)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <ChapterHeader eyebrow="Pipeline" title={dict.pipeline.titlePrefix} />
          <p className="mb-2 text-[12px] text-[var(--ci-text-muted)]">{dict.pipeline.inLucru(inLucruPipeline)}</p>
          <div className="space-y-2">
            {pipeline.map((p) => (
              <div key={p.stage} className="flex items-center justify-between text-[13px]">
                <span className="text-[var(--ci-text-muted)]">{p.label}</span>
                <span className="ci-tabular font-medium text-[var(--ci-text)]">{p.stage === "sponsorizat" ? formatSuma(p.suma) : p.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <ChapterHeader eyebrow="Echipă" title={dict.team.title} />
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
            <span className="text-[var(--ci-text-muted)]">
              {dict.team.calls}: <strong className="ci-tabular text-[var(--ci-text)]">{apeluriReale ?? 0}</strong>
            </span>
            <span className="text-[var(--ci-text-muted)]">
              {dict.team.emails}: <strong className="ci-tabular text-[var(--ci-text)]">112</strong>
            </span>
            <span className="text-[var(--ci-text-muted)]">
              {dict.team.meetings}: <strong className="ci-tabular text-[var(--ci-text)]">9</strong>
            </span>
            <span className="text-[var(--ci-text-muted)]">
              {dict.team.tasksDone}: <strong className="ci-tabular text-[var(--ci-text)]">41</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
