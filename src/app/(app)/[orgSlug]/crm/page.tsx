"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Input } from "./components/ui/input";
import { DomainWelcomeBanner } from "./components/domain-welcome-banner";
import { CaldProtectorDashboard } from "./components/dashboard/cald-protector-dashboard";
import { ElegantEditorialDashboard } from "./components/dashboard/elegant-editorial-dashboard";
import { IndraznetDinamicDashboard } from "./components/dashboard/indraznet-dinamic-dashboard";
import { NaturalAncoratDashboard } from "./components/dashboard/natural-ancorat-dashboard";
import { NeutruDashboard } from "./components/dashboard/neutru-dashboard";
import { TaskuriCard } from "./components/dashboard/taskuri-card";
import type { DashboardData } from "./components/dashboard/types";
import { useLocale } from "./lib/locale-context";
import { useDomeniu } from "./lib/domeniu-context";
import { CAMPAIGN_TEMPLATES } from "@/lib/campaign-templates";
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

  const domeniu = useDomeniu();
  const familie = domeniu ? CAMPAIGN_TEMPLATES[domeniu].familie : "neutru";

  const dashboardData: DashboardData = {
    base,
    dict,
    domeniu,
    kpis,
    actiuni,
    evolutie,
    pipeline,
    inLucruPipeline,
    campaniiActive,
    blocate,
    apeluriReale,
    prioritateLabels: DASHBOARD_MOCK_DICT[locale].prioritate,
  };

  const FamilyDashboard = {
    "cald-protector": CaldProtectorDashboard,
    "natural-ancorat": NaturalAncoratDashboard,
    "indraznet-dinamic": IndraznetDinamicDashboard,
    "elegant-editorial": ElegantEditorialDashboard,
    neutru: NeutruDashboard,
  }[familie];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      <TaskuriCard taskuri={taskuriLive} base={base} locale={locale} />

      <DomainWelcomeBanner salut={salut} nume="Vlad" subtitle={dict.summary(actiuni.length, blocate)} />

      {/* Filtrul de perioadă rămâne identic pentru orice familie — e un
          control, nu un widget de conținut, deci nu face parte din
          redesign-ul structural per domeniu (vezi components/dashboard/). */}
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

      <FamilyDashboard {...dashboardData} />
    </div>
  );
}
