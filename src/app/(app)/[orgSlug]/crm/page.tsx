"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Input } from "./components/ui/input";
import { DomainWelcomeBanner } from "./components/domain-welcome-banner";
import { DemoBanner } from "./components/demo-banner";
import { TaskuriCard } from "./components/dashboard/taskuri-card";
import { RiscPipelineCard } from "./components/dashboard/risc-pipeline-card";
import { TopSponsoriCard } from "./components/dashboard/top-sponsori-card";
import { PrimiiPasiCard, type PrimiiPasi } from "./components/dashboard/primii-pasi-card";
import type { DashboardData } from "./components/dashboard/types";
import { useLocale } from "./lib/locale-context";
import { useDomeniu } from "./lib/domeniu-context";
import { useUtilizatorPrenume } from "./lib/utilizator-context";
import { seteazaExempleDemo, useExempleDemo } from "./lib/exemple-demo";
import { CAMPAIGN_TEMPLATES } from "@/lib/campaign-templates";
import { DASHBOARD_HOME_DICT } from "@/lib/i18n/dictionaries/dashboard-home";
import { DASHBOARD_MOCK_DICT } from "@/lib/i18n/dictionaries/dashboard-mock";
import { useSalut } from "@/lib/use-salut";
import {
  getTaskStatusOverride,
  getTaskTermenOverride,
  getTaskuriGlobale,
  getTaskuriSterse,
  useLocalStoreValue,
} from "./lib/local-store";
import { dateDashboardLive } from "./dashboard-actions";
import { useBeneficiari, useCompanii } from "./lib/use-data";
import { TASKURI, centruDeActiuni, companiiPipelineStats, dashboardKpis, lunarEvolutie, type PerioadaKpi, type Task } from "./mock";

// Doar dashboard-ul familiei alese de organizație se încarcă (recharts e greu): celelalte patru nu ajung în browser.
const incarcare = () => <div className="h-96 animate-pulse rounded-xl bg-black/5" aria-hidden />;
const CaldProtectorDashboard = dynamic(() => import("./components/dashboard/cald-protector-dashboard").then((m) => m.CaldProtectorDashboard), { loading: incarcare });
const ElegantEditorialDashboard = dynamic(() => import("./components/dashboard/elegant-editorial-dashboard").then((m) => m.ElegantEditorialDashboard), { loading: incarcare });
const IndraznetDinamicDashboard = dynamic(() => import("./components/dashboard/indraznet-dinamic-dashboard").then((m) => m.IndraznetDinamicDashboard), { loading: incarcare });
const NaturalAncoratDashboard = dynamic(() => import("./components/dashboard/natural-ancorat-dashboard").then((m) => m.NaturalAncoratDashboard), { loading: incarcare });
const NeutruDashboard = dynamic(() => import("./components/dashboard/neutru-dashboard").then((m) => m.NeutruDashboard), { loading: incarcare });


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
  const [topSponsori, setTopSponsori] = useState<Awaited<ReturnType<typeof dateDashboardLive>>["topSponsori"] | null>(null);
  const [primiiPasi, setPrimiiPasi] = useState<PrimiiPasi | null>(null);
  const [riscPipeline, setRiscPipeline] = useState<Awaited<ReturnType<typeof dateDashboardLive>>["riscPipeline"] | null>(null);
  useEffect(() => {
    // O singură cerere pentru apeluri + top sponsori + risc pipeline (înainte: trei acțiuni în coadă).
    dateDashboardLive(orgSlug)
      .then((d) => {
        setApeluriReale(d.apeluri);
        setTopSponsori(d.topSponsori);
        setRiscPipeline(d.riscPipeline);
        setPrimiiPasi(d.primiiPasi);
      })
      .catch(() => {
        setTopSponsori([]);
        setRiscPipeline([]);
      });
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

  const salut = useSalut(dict.greeting);
  const prenume = useUtilizatorPrenume();
  const exemple = useExempleDemo(orgSlug);
  // Organizație nouă (niciun donator, nicio pagină de campanie): tabloul de bord cu date inventate apare doar la cerere.
  const faraDateReale = primiiPasi !== null && !primiiPasi.donatori && !primiiPasi.pagina;
  const arataDashboard = primiiPasi !== null && (!faraDateReale || exemple);

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
      {arataDashboard && (
        <DomainWelcomeBanner salut={salut} nume={prenume} subtitle={dict.summary(actiuni.length, blocate)} />
      )}

      {faraDateReale && !exemple && (
        <>
          <DomainWelcomeBanner
            salut={salut}
            nume={prenume}
            subtitle={locale === "ro" ? "Bine ai venit! Începe cu pașii de mai jos — durează doar câteva minute." : "Welcome! Start with the steps below — it only takes a few minutes."}
          />
          <div className="rounded-[var(--ci-radius-card)] border border-dashed border-[var(--ci-border-strong)] bg-[var(--ci-surface)] p-5 text-center">
            <p className="text-[14px] font-semibold text-[var(--ci-text)]">
              {locale === "ro" ? "Tabloul tău de bord se va completa singur pe măsură ce adaugi donatori și campanii." : "Your dashboard will fill in as you add donors and campaigns."}
            </p>
            <p className="mt-1 text-[13px] text-[var(--ci-text-muted)]">
              {locale === "ro" ? "Vrei să vezi cum va arăta, cu date inventate?" : "Want to see what it will look like, with made-up data?"}
            </p>
            <button
              type="button"
              onClick={() => seteazaExempleDemo(orgSlug, true)}
              className="mt-3 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border-strong)] px-4 py-2 text-[13px] font-semibold text-[var(--ci-primary)] transition-colors hover:bg-[var(--ci-primary-soft)]"
            >
              {locale === "ro" ? "Arată un exemplu" : "Show an example"}
            </button>
          </div>
        </>
      )}

      {arataDashboard && (
        <>
      <DemoBanner>
        {locale === "ro"
          ? "Atenție: cifrele, proiectele și taskurile de mai jos sunt EXEMPLE, ca să vezi cum arată platforma — nu sunt datele organizației tale. Datele tale reale apar în „Persoane fizice”, „Donații” și „Strângere fonduri”. Exemplele se păstrează doar în acest browser."
          : "Note: the figures, projects and tasks below are EXAMPLES so you can see how the platform looks — they are not your organization's data. Your real data appears under “Individuals”, “Donations” and “Fundraising pages”. The examples are kept only in this browser."}
      </DemoBanner>

      <TaskuriCard taskuri={taskuriLive} base={base} locale={locale} />

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

      <RiscPipelineCard orgSlug={orgSlug} ro={locale === "ro"} rows={riscPipeline} />

      <TopSponsoriCard orgSlug={orgSlug} ro={locale === "ro"} rows={topSponsori} />
          {faraDateReale && (
            <div className="text-center">
              <button type="button" onClick={() => seteazaExempleDemo(orgSlug, false)} className="text-[13px] font-semibold text-[var(--ci-primary)] hover:underline">
                {locale === "ro" ? "Ascunde exemplul" : "Hide the example"}
              </button>
            </div>
          )}
        </>
      )}

      <PrimiiPasiCard orgSlug={orgSlug} ro={locale === "ro"} pasi={primiiPasi} />

      {primiiPasi === null && <div className="h-72 animate-pulse rounded-xl bg-black/5" aria-hidden />}
    </div>
  );
}
