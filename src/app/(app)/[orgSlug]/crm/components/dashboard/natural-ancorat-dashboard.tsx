import { ArrowRight, Calendar, CheckCircle2, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";

import { DomainMotif } from "@/components/domain-motif";
import { CAMPAIGN_TEMPLATES } from "@/lib/campaign-templates";

import { Badge } from "../ui/badge";
import { Card, CardHeader } from "../ui/card";
import { ProgressBar } from "../ui/progress-bar";
import { formatDataRelativa, formatSuma } from "../../lib/format";
import { ImpactBadge } from "./impact-badge";
import type { DashboardData } from "./types";

const PRIORITATE_TONE = { mare: "red", medie: "amber", mica: "neutral" } as const;

// Familia natural-ancorat (Animale/Mediu) — inspirată din pattern-ul WWF de
// "adopție simbolică": impactul e comunicat ca o insignă/counter mare, nu ca
// un card mic într-un grid de cifre, iar pipeline-ul de companii devine un
// traseu orizontal de etape (gen hartă/potecă), nu un tabel de rânduri.
export function NaturalAncoratDashboard({
  base,
  dict,
  domeniu,
  kpis,
  actiuni,
  evolutie,
  pipeline,
  campaniiActive,
  apeluriReale,
  prioritateLabels,
}: DashboardData) {
  const totalKpi = kpis[0];
  const restKpi = kpis.slice(1);
  const motiv = domeniu ? CAMPAIGN_TEMPLATES[domeniu].motiv : null;
  const itemLabel = domeniu ? CAMPAIGN_TEMPLATES[domeniu].itemLabel : undefined;

  return (
    <>
      <Card className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
        {totalKpi && (
          <ImpactBadge
            value={totalKpi.unitate === "count" ? String(Math.round(totalKpi.valoare)) : formatSuma(totalKpi.valoare)}
            label={totalKpi.label}
            icon={<DomainMotif motiv={motiv} className="h-5 w-5" />}
          />
        )}
        <div className="flex flex-wrap gap-4">
          {restKpi.map((k) => (
            <Link key={k.key} href={`${base}/${k.href}`} className="text-center">
              <p className="ci-display ci-tabular text-lg font-bold text-[var(--ci-text)]">
                {k.unitate === "count" ? Math.round(k.valoare) : k.unitate === "percent" ? `${Math.round(k.valoare)}%` : formatSuma(k.valoare)}
              </p>
              <p className="text-[11px] text-[var(--ci-text-muted)]">{k.label}</p>
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title={dict.pipeline.titlePrefix} subtitle={dict.pipeline.inLucru(pipeline.filter((p) => p.stage !== "sponsorizat").reduce((s, p) => s + p.count, 0))} />
        <div className="flex items-center overflow-x-auto pb-1">
          {pipeline.map((p, i) => (
            <div key={p.stage} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-sm font-bold text-[var(--ci-primary)]">
                  {p.stage === "sponsorizat" ? "✓" : p.count}
                </div>
                <span className="w-20 text-center text-[11px] text-[var(--ci-text-muted)]">{p.label}</span>
              </div>
              {i < pipeline.length - 1 && <div className="mx-1 h-0.5 w-8 shrink-0 bg-[var(--ci-border-strong)] sm:w-14" />}
            </div>
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
                className="relative rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4 pt-5 shadow-[var(--ci-card-shadow)] transition-shadow hover:shadow-[var(--ci-shadow-lg)]"
              >
                <div className="absolute -top-3 left-4 flex h-7 w-7 items-center justify-center rounded-full bg-[var(--ci-primary)] text-white shadow-[var(--ci-shadow-sm)]">
                  <DomainMotif motiv={motiv} className="h-3.5 w-3.5" />
                </div>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-[var(--ci-text)]">{b.nume}</p>
                  <Badge tone={b.statusCampanie === "urgenta" ? "red" : "blue"}>
                    {b.statusCampanie === "urgenta" ? dict.proiecte.urgenta : dict.proiecte.activa}
                  </Badge>
                </div>
                <ProgressBar value={pct} tone={b.statusCampanie === "urgenta" ? "primary" : "blue"} />
                <div className="mt-2 flex items-center justify-between text-[12px] text-[var(--ci-text-muted)]">
                  <span className="ci-tabular">
                    {formatSuma(b.sumaStransa)} {dict.proiecte.din} {formatSuma(b.obiectiv)}
                  </span>
                  <span className="ci-tabular font-medium text-[var(--ci-text)]">{pct}%</span>
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
            <div key={a.id} className="flex items-center gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-3">
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title={dict.donationChart.title} subtitle={dict.donationChart.subtitle} />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={evolutie}>
                <CartesianGrid stroke="var(--ci-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--ci-text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--ci-text-muted)" }} axisLine={false} tickLine={false} width={40} />
                <RTooltip formatter={(v) => formatSuma(Number(v))} contentStyle={{ borderRadius: 8, border: "1px solid var(--ci-border)", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="pf" name={dict.donationChart.pf} stackId="a" fill="var(--ci-primary)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pj" name={dict.donationChart.pj} stackId="a" fill="#8a7048" radius={[0, 0, 0, 0]} />
                <Bar dataKey="recurent" name={dict.donationChart.recurent} stackId="a" fill="#3fa85c" radius={[4, 4, 0, 0]} />
                <Line dataKey="anTrecut" name={dict.donationChart.anTrecut} stroke="var(--ci-text-faint)" strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title={dict.team.title} subtitle={dict.team.subtitle} />
          <div className="grid grid-cols-2 gap-3">
            <TeamStat icon={Phone} label={dict.team.calls} value={apeluriReale ?? 0} />
            <TeamStat icon={Mail} label={dict.team.emails} value={112} />
            <TeamStat icon={Calendar} label={dict.team.meetings} value={9} />
            <TeamStat icon={CheckCircle2} label={dict.team.tasksDone} value={41} />
          </div>
        </Card>
      </div>
    </>
  );
}

function TeamStat({ icon: Icon, label, value }: { icon: typeof Phone; label: string; value: number }) {
  return (
    <div className="rounded-[var(--ci-radius-card)] bg-[var(--ci-surface-2)] p-3">
      <Icon className="mb-1.5 h-4 w-4 text-[var(--ci-text-muted)]" />
      <p className="ci-tabular text-base font-bold text-[var(--ci-text)]">{value}</p>
      <p className="text-[11px] text-[var(--ci-text-muted)]">{label}</p>
    </div>
  );
}
