import { ArrowRight, Calendar, CheckCircle2, Mail, Phone, Users2 } from "lucide-react";
import Link from "next/link";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";

import { Badge } from "../ui/badge";
import { Card, CardHeader } from "../ui/card";
import { ProgressBar } from "../ui/progress-bar";
import { KpiCard } from "../kpi-card";
import { formatDataRelativa, formatSuma } from "../../lib/format";
import type { DashboardData } from "./types";

const PRIORITATE_TONE = { mare: "red", medie: "amber", mica: "neutral" } as const;

// Layout-ul de azi al panoului, neschimbat — folosit pentru "altele"/fără
// domeniu ales. Zero regresie: pixel-identic cu dashboard-ul dinaintea
// redesign-ului per familie.
export function NeutruDashboard({ base, dict, kpis, actiuni, evolutie, pipeline, inLucruPipeline, campaniiActive, blocate, apeluriReale, prioritateLabels }: DashboardData) {
  return (
    <>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
        {kpis.map((k) => (
          <KpiCard
            key={k.key}
            label={k.label}
            valoare={k.valoare}
            variatie={k.variatie}
            spark={k.spark}
            explicatie={k.explicatie}
            unitate={k.unitate}
            href={`${base}/${k.href}`}
          />
        ))}
      </div>

      <Card>
        <CardHeader title={dict.actionCenter.title} subtitle={dict.actionCenter.subtitle} />
        <div className="space-y-2">
          {actiuni.map((a) => (
            <div key={a.id} className="flex items-center gap-3 rounded-lg border border-[var(--ci-border)] px-3.5 py-3">
              <Badge tone={PRIORITATE_TONE[a.prioritate]}>{prioritateLabels[a.prioritate]}</Badge>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">{a.motiv}</p>
                <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">
                  {a.responsabil} · termen {formatDataRelativa(a.termen)}
                </p>
              </div>
              <Link
                href={`${base}/${a.href}`}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-[var(--ci-border)] px-3 text-[12px] font-medium text-[var(--ci-text)] transition-colors hover:border-[var(--ci-primary)] hover:text-[var(--ci-primary)]"
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
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={evolutie}>
                <CartesianGrid stroke="var(--ci-border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: "var(--ci-text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "var(--ci-text-muted)" }} axisLine={false} tickLine={false} width={40} />
                <RTooltip formatter={(v) => formatSuma(Number(v))} contentStyle={{ borderRadius: 8, border: "1px solid var(--ci-border)", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="pf" name={dict.donationChart.pf} stackId="a" fill="#2563EB" radius={[0, 0, 0, 0]} />
                <Bar dataKey="pj" name={dict.donationChart.pj} stackId="a" fill="#E63946" radius={[0, 0, 0, 0]} />
                <Bar dataKey="recurent" name={dict.donationChart.recurent} stackId="a" fill="#16A34A" radius={[4, 4, 0, 0]} />
                <Line dataKey="anTrecut" name={dict.donationChart.anTrecut} stroke="var(--ci-text-faint)" strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title={dict.pipeline.titlePrefix} subtitle={dict.pipeline.inLucru(inLucruPipeline)} />
          <div className="space-y-3">
            {pipeline.map((p) => (
              <Row key={p.stage} label={p.label} value={p.stage === "sponsorizat" ? formatSuma(p.suma) : String(p.count)} tone={p.stage === "sponsorizat" ? undefined : p.count > 0 && blocate > 0 ? "amber" : undefined} />
            ))}
          </div>
          <Link
            href={`${base}/companii`}
            className="mt-4 flex items-center justify-center gap-1.5 rounded-lg border border-[var(--ci-border)] py-2 text-[13px] font-medium text-[var(--ci-text)] transition-colors hover:border-[var(--ci-primary)] hover:text-[var(--ci-primary)]"
          >
            {dict.pipeline.seeAll} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Card>
      </div>

      <div>
        <CardHeader
          title={dict.proiecte.title}
          subtitle={dict.proiecte.subtitle}
          action={
            <Link href={`${base}/beneficiari`} className="text-[13px] font-medium text-[var(--ci-blue)] hover:underline">
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
                className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4 shadow-[var(--ci-shadow-sm)] transition-shadow hover:shadow-[var(--ci-shadow-md)]"
              >
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
                <p className="mt-1 text-[12px] text-[var(--ci-text-faint)]">{dict.proiecte.zileActive(b.zileActive)}</p>
              </Link>
            );
          })}
        </div>
      </div>

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

function Row({ label, value, tone }: { label: string; value: string; tone?: "amber" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-[var(--ci-text-muted)]">{label}</span>
      <span className={`ci-tabular text-sm font-semibold ${tone === "amber" ? "text-[var(--ci-amber)]" : "text-[var(--ci-text)]"}`}>{value}</span>
    </div>
  );
}

function TeamStat({ icon: Icon, label, value }: { icon: typeof Users2; label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--ci-surface-2)] p-3.5">
      <Icon className="mb-2 h-4 w-4 text-[var(--ci-text-muted)]" />
      <p className="ci-tabular text-lg font-bold text-[var(--ci-text)]">{value}</p>
      <p className="text-[12px] text-[var(--ci-text-muted)]">{label}</p>
    </div>
  );
}
