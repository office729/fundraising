"use client";

import { ArrowRight, Calendar, CheckCircle2, Mail, Phone, Users2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";

import { Badge } from "./components/ui/badge";
import { Card, CardHeader } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { ProgressBar } from "./components/ui/progress-bar";
import { KpiCard } from "./components/kpi-card";
import { formatDataRelativa, formatSuma } from "./lib/format";
import { useLocale } from "./lib/locale-context";
import { DASHBOARD_HOME_DICT } from "@/lib/i18n/dictionaries/dashboard-home";
import { DASHBOARD_MOCK_DICT } from "@/lib/i18n/dictionaries/dashboard-mock";
import {
  getTaskStatusOverride,
  getTaskTermenOverride,
  getTaskuriGlobale,
  getTaskuriSterse,
  useLocalStoreValue,
} from "./lib/local-store";
import { numarApeluriUltimele30Zile } from "./dashboard-actions";
import { useBeneficiari, useCompanii } from "./lib/use-data";
import { TASKURI, centruDeActiuni, companiiPipelineStats, dashboardKpis, lunarEvolutie, type PerioadaKpi, type Task } from "./mock";

const EMPTY_TASKURI: Task[] = [];
const EMPTY_MAP: Record<string, string> = {};
const EMPTY_BOOL_MAP: Record<string, boolean> = {};

const PRIORITATE_TONE = { mare: "red", medie: "amber", mica: "neutral" } as const;

type PerioadaCheie = "toata" | "saptamana" | "luna" | "q1" | "q2" | "q3" | "q4" | "an" | "personalizat";

export default function CrmDashboardPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const base = `/${orgSlug}/crm`;

  // Apeluri = date REALE (Twilio), spre deosebire de Emailuri/Întâlniri/
  // Taskuri rezolvate de mai jos, care rămân demonstrative deocamdată.
  const [apeluriReale, setApeluriReale] = useState<number | null>(null);
  useEffect(() => {
    numarApeluriUltimele30Zile(orgSlug).then(setApeluriReale);
  }, [orgSlug]);
  const locale = useLocale();
  const dict = DASHBOARD_HOME_DICT[locale];
  const PERIOADE = dict.perioade as { key: PerioadaCheie; label: string }[];

  const [perioadaCheie, setPerioadaCheie] = useState<PerioadaCheie>("toata");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const perioada = useMemo<PerioadaKpi | undefined>(() => {
    if (perioadaCheie === "toata") return undefined;
    const now = new Date();
    const an = now.getFullYear();
    const label = PERIOADE.find((p) => p.key === perioadaCheie)?.label ?? "";
    switch (perioadaCheie) {
      case "saptamana": {
        const ziSaptamana = now.getDay() || 7;
        const start = new Date(an, now.getMonth(), now.getDate() - ziSaptamana + 1);
        return { start, end: now, label };
      }
      case "luna":
        return { start: new Date(an, now.getMonth(), 1), end: now, label };
      case "q1":
        return { start: new Date(an, 0, 1), end: new Date(an, 2, 31, 23, 59, 59), label };
      case "q2":
        return { start: new Date(an, 3, 1), end: new Date(an, 5, 30, 23, 59, 59), label };
      case "q3":
        return { start: new Date(an, 6, 1), end: new Date(an, 8, 30, 23, 59, 59), label };
      case "q4":
        return { start: new Date(an, 9, 1), end: new Date(an, 11, 31, 23, 59, 59), label };
      case "an":
        return { start: new Date(an, 0, 1), end: now, label };
      case "personalizat":
        if (!customStart || !customEnd) return undefined;
        return { start: new Date(customStart), end: new Date(`${customEnd}T23:59:59`), label };
      default:
        return undefined;
    }
  }, [perioadaCheie, customStart, customEnd, PERIOADE]);

  const globale = useLocalStoreValue(getTaskuriGlobale, EMPTY_TASKURI);
  const statusOverride = useLocalStoreValue(getTaskStatusOverride, EMPTY_MAP as Record<string, Task["status"]>);
  const termenOverride = useLocalStoreValue(getTaskTermenOverride, EMPTY_MAP);
  const sterse = useLocalStoreValue(getTaskuriSterse, EMPTY_BOOL_MAP);
  const taskuriLive = useMemo(() => {
    const mock = TASKURI.filter((t) => !sterse[t.id]).map((t) => ({
      ...t,
      status: statusOverride[t.id] ?? t.status,
      termenLa: termenOverride[t.id] ?? t.termenLa,
    }));
    return [...globale, ...mock];
  }, [globale, statusOverride, termenOverride, sterse]);

  const kpis = dashboardKpis(perioada, locale);
  const actiuni = centruDeActiuni(taskuriLive, locale);
  const evolutie = lunarEvolutie();
  const BENEFICIARI = useBeneficiari();
  const campaniiActive = BENEFICIARI.filter((b) => b.statusCampanie !== "finalizata");
  const COMPANII = useCompanii();
  const pipeline = companiiPipelineStats(COMPANII, locale);
  const inLucruPipeline = pipeline.filter((p) => p.stage !== "sponsorizat").reduce((s, p) => s + p.count, 0);
  const blocate = actiuni.filter((a) => a.tip === "companie").length;

  const hour = new Date().getHours();
  const salut = hour < 12 ? dict.greeting.morning : hour < 18 ? dict.greeting.afternoon : dict.greeting.evening;

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <div>
        <h1 className="ci-display text-xl font-bold text-[var(--ci-text)]">{salut}, Vlad.</h1>
        <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">{dict.summary(actiuni.length, blocate)}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PERIOADE.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setPerioadaCheie(p.key)}
            className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              perioadaCheie === p.key
                ? "border-[var(--ci-blue)] bg-[var(--ci-blue-soft)] text-[var(--ci-blue)]"
                : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"
            }`}
          >
            {p.label}
          </button>
        ))}
        {perioadaCheie === "personalizat" && (
          <div className="flex items-center gap-2">
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="h-8 w-36 text-[12px]" />
            <span className="text-[12px] text-[var(--ci-text-muted)]">–</span>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="h-8 w-36 text-[12px]" />
          </div>
        )}
      </div>

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
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-lg border border-[var(--ci-border)] px-3.5 py-3"
            >
              <Badge tone={PRIORITATE_TONE[a.prioritate]}>{DASHBOARD_MOCK_DICT[locale].prioritate[a.prioritate]}</Badge>
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
                <RTooltip
                  formatter={(v) => formatSuma(Number(v))}
                  contentStyle={{ borderRadius: 8, border: "1px solid var(--ci-border)", fontSize: 12 }}
                />
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
              <Row
                key={p.stage}
                label={p.label}
                value={p.stage === "sponsorizat" ? formatSuma(p.suma) : String(p.count)}
                tone={p.stage === "sponsorizat" ? undefined : p.count > 0 && blocate > 0 ? "amber" : undefined}
              />
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
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: "amber" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-[var(--ci-text-muted)]">{label}</span>
      <span
        className={`ci-tabular text-sm font-semibold ${tone === "amber" ? "text-[var(--ci-amber)]" : "text-[var(--ci-text)]"}`}
      >
        {value}
      </span>
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
