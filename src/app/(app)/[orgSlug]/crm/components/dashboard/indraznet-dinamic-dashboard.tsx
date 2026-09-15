import { ArrowRight, Calendar, CheckCircle2, Mail, Phone } from "lucide-react";
import Link from "next/link";

import { CAMPAIGN_TEMPLATES } from "@/lib/campaign-templates";

import { Badge } from "../ui/badge";
import { Card, CardHeader } from "../ui/card";
import { ProgressBar } from "../ui/progress-bar";
import { formatDataRelativa, formatSuma } from "../../lib/format";
import { ScoreboardStat } from "./scoreboard-stat";
import type { DashboardData } from "./types";

const PRIORITATE_TONE = { mare: "red", medie: "amber", mica: "neutral" } as const;

// Familia îndrăzneț-dinamic (Sport/Educație) — energie de scoreboard: cifre
// mari alăturate pe o bandă solidă (ca bannerul deja construit), centrul de
// acțiuni devine o listă de "provocări active", iar pipeline-ul de companii
// e o singură bară de progres tip "traseu de cursă" în loc de rânduri.
export function IndraznetDinamicDashboard({
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
  const totalPipeline = pipeline.reduce((s, p) => s + (p.stage === "sponsorizat" ? 0 : p.count), 1);

  return (
    <>
      <div className="relative overflow-hidden rounded-[var(--ci-radius-card)] bg-[var(--ci-primary)] px-6 py-5">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 right-0 w-32 bg-white/10"
          style={{ clipPath: "polygon(40% 0, 100% 0, 100% 100%, 0 100%)" }}
        />
        <div className="relative flex flex-wrap gap-x-8 gap-y-4">
          {kpis.map((k) => (
            <ScoreboardStat
              key={k.key}
              tone="dark"
              label={k.label}
              value={k.unitate === "count" ? String(Math.round(k.valoare)) : k.unitate === "percent" ? `${Math.round(k.valoare)}%` : formatSuma(k.valoare)}
            />
          ))}
        </div>
      </div>

      <Card>
        <CardHeader title={dict.pipeline.titlePrefix} subtitle={dict.pipeline.inLucru(inLucruPipeline)} />
        <div className="flex h-4 w-full overflow-hidden rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)]">
          {pipeline
            .filter((p) => p.stage !== "sponsorizat")
            .map((p, i) => (
              <div
                key={p.stage}
                className="h-full border-r-2 border-[var(--ci-surface)] bg-[var(--ci-primary)] last:border-r-0"
                style={{ width: `${(p.count / totalPipeline) * 100}%`, opacity: 0.5 + i * 0.15 }}
                title={`${p.label}: ${p.count}`}
              />
            ))}
        </div>
        <div className="mt-2 flex flex-wrap justify-between gap-2">
          {pipeline.map((p) => (
            <span key={p.stage} className="text-[11px] text-[var(--ci-text-muted)]">
              {p.label} · <strong className="text-[var(--ci-text)]">{p.stage === "sponsorizat" ? formatSuma(p.suma) : p.count}</strong>
            </span>
          ))}
        </div>
      </Card>

      <div>
        <CardHeader
          title={itemLabel ?? dict.proiecte.title}
          subtitle={dict.proiecte.subtitle}
          action={
            <Link href={`${base}/beneficiari`} className="text-[13px] font-medium text-[var(--ci-primary)] hover:underline">
              {dict.proiecte.seeAll}
            </Link>
          }
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {campaniiActive.map((b) => {
            const pct = Math.round((b.sumaStransa / b.obiectiv) * 100);
            return (
              <Link
                key={b.id}
                href={`${base}/beneficiari/${b.id}`}
                className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4 [border-left:var(--ci-card-accent)] shadow-[var(--ci-card-shadow)] transition-shadow hover:shadow-[var(--ci-shadow-lg)]"
              >
                <div className="mb-2 flex items-center justify-between">
                  <p className="ci-display text-sm font-bold tracking-wide text-[var(--ci-text)] uppercase">{b.nume}</p>
                  <Badge tone={b.statusCampanie === "urgenta" ? "red" : "blue"}>
                    {b.statusCampanie === "urgenta" ? dict.proiecte.urgenta : dict.proiecte.activa}
                  </Badge>
                </div>
                <ProgressBar value={pct} tone={b.statusCampanie === "urgenta" ? "primary" : "blue"} />
                <div className="mt-2 flex items-center justify-between text-[12px] text-[var(--ci-text-muted)]">
                  <span className="ci-tabular">
                    {formatSuma(b.sumaStransa)} {dict.proiecte.din} {formatSuma(b.obiectiv)}
                  </span>
                  <span className="ci-tabular font-bold text-[var(--ci-primary)]">{pct}%</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <Card>
        <CardHeader title={dict.actionCenter.title} subtitle={dict.actionCenter.subtitle} />
        <div className="space-y-2">
          {actiuni.map((a) => (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-3 [border-left:var(--ci-card-accent)]"
            >
              <Badge tone={PRIORITATE_TONE[a.prioritate]}>{prioritateLabels[a.prioritate]}</Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">{a.motiv}</p>
                <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">
                  {a.responsabil} · termen {formatDataRelativa(a.termen)}
                </p>
              </div>
              <Link
                href={`${base}/${a.href}`}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 text-[12px] font-medium text-[var(--ci-text)] transition-colors hover:border-[var(--ci-primary)] hover:text-[var(--ci-primary)]"
              >
                {dict.actionCenter.resolve} <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title={dict.team.title} subtitle={dict.team.subtitle} />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <TeamStat icon={Phone} label={dict.team.calls} value={apeluriReale ?? 0} />
          <TeamStat icon={Mail} label={dict.team.emails} value={112} />
          <TeamStat icon={Calendar} label={dict.team.meetings} value={9} />
          <TeamStat icon={CheckCircle2} label={dict.team.tasksDone} value={41} />
        </div>
      </Card>
    </>
  );
}

function TeamStat({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: number }) {
  return (
    <div className="rounded-[var(--ci-radius-card)] bg-[var(--ci-surface-2)] p-3.5">
      <Icon className="mb-2 h-4 w-4 text-[var(--ci-text-muted)]" />
      <p className="ci-tabular text-lg font-bold text-[var(--ci-text)]">{value}</p>
      <p className="text-[12px] text-[var(--ci-text-muted)]">{label}</p>
    </div>
  );
}
