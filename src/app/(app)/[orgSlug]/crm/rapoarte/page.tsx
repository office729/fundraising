"use client";

import { Printer } from "lucide-react";
import { useState } from "react";

import { Card, CardHeader } from "../components/ui/card";
import { formatSuma } from "../lib/format";
import { useLocale } from "../lib/locale-context";
import { RAPOARTE_DICT } from "@/lib/i18n/dictionaries/rapoarte";
import { BENEFICIARI, COMPANII, lunarEvolutie } from "../mock";

type ReportKey = "campanie" | "sponsor" | "perioada";

const REPORT_KEYS: ReportKey[] = ["campanie", "sponsor", "perioada"];

export default function RapoartePage() {
  const [active, setActive] = useState<ReportKey>("campanie");
  const locale = useLocale();
  const dict = RAPOARTE_DICT[locale];

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--ci-border)] px-3.5 text-sm font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
        >
          <Printer className="h-4 w-4" /> {dict.printeaza}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {REPORT_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            className={`rounded-xl border p-4 text-left transition-colors ${
              active === key
                ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)]"
                : "border-[var(--ci-border)] bg-[var(--ci-surface)] hover:border-[var(--ci-border-strong)]"
            }`}
          >
            <p className="text-[13px] font-semibold text-[var(--ci-text)]">{dict.reports[key].label}</p>
            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{dict.reports[key].description}</p>
          </button>
        ))}
      </div>

      {active === "campanie" && <RaportCampanie />}
      {active === "sponsor" && <RaportSponsor />}
      {active === "perioada" && <RaportPerioada />}
    </div>
  );
}

function RaportCampanie() {
  const locale = useLocale();
  const dict = RAPOARTE_DICT[locale];
  return (
    <Card>
      <CardHeader title={dict.reports.campanie.label} subtitle={dict.campanie.subtitle(BENEFICIARI.length)} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--ci-border)] text-left text-[12px] text-[var(--ci-text-muted)]">
            <th className="py-2 font-semibold">{dict.campanie.columns.beneficiar}</th>
            <th className="py-2 font-semibold">{dict.campanie.columns.status}</th>
            <th className="py-2 text-right font-semibold">{dict.campanie.columns.obiectiv}</th>
            <th className="py-2 text-right font-semibold">{dict.campanie.columns.strans}</th>
            <th className="py-2 text-right font-semibold">{dict.campanie.columns.progres}</th>
          </tr>
        </thead>
        <tbody>
          {BENEFICIARI.map((b) => (
            <tr key={b.id} className="border-b border-[var(--ci-border)] last:border-0">
              <td className="py-2.5 font-medium text-[var(--ci-text)]">{b.nume}</td>
              <td className="py-2.5 text-[var(--ci-text-muted)]">{b.statusCampanie}</td>
              <td className="ci-tabular py-2.5 text-right">{formatSuma(b.obiectiv)}</td>
              <td className="ci-tabular py-2.5 text-right">{formatSuma(b.sumaStransa)}</td>
              <td className="ci-tabular py-2.5 text-right font-medium">{Math.round((b.sumaStransa / b.obiectiv) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function RaportSponsor() {
  const locale = useLocale();
  const dict = RAPOARTE_DICT[locale];
  const sorted = [...COMPANII].sort((a, b) => b.sumaSponsorizata - a.sumaSponsorizata);
  const total = sorted.reduce((s, c) => s + c.sumaSponsorizata, 0);
  return (
    <Card>
      <CardHeader title={dict.reports.sponsor.label} subtitle={dict.sponsor.subtitle(formatSuma(total))} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--ci-border)] text-left text-[12px] text-[var(--ci-text-muted)]">
            <th className="py-2 font-semibold">{dict.sponsor.columns.companie}</th>
            <th className="py-2 font-semibold">{dict.sponsor.columns.industrie}</th>
            <th className="py-2 text-right font-semibold">{dict.sponsor.columns.contribuit}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((c) => (
            <tr key={c.id} className="border-b border-[var(--ci-border)] last:border-0">
              <td className="py-2.5 font-medium text-[var(--ci-text)]">{c.nume}</td>
              <td className="py-2.5 text-[var(--ci-text-muted)]">{c.industrie}</td>
              <td className="ci-tabular py-2.5 text-right font-medium">{formatSuma(c.sumaSponsorizata)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function RaportPerioada() {
  const locale = useLocale();
  const dict = RAPOARTE_DICT[locale];
  const data = lunarEvolutie();
  return (
    <Card>
      <CardHeader title={dict.reports.perioada.label} subtitle={dict.perioada.subtitle} />
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--ci-border)] text-left text-[12px] text-[var(--ci-text-muted)]">
            <th className="py-2 font-semibold">{dict.perioada.columns.luna}</th>
            <th className="py-2 text-right font-semibold">{dict.perioada.columns.persoaneFizice}</th>
            <th className="py-2 text-right font-semibold">{dict.perioada.columns.companii}</th>
            <th className="py-2 text-right font-semibold">{dict.perioada.columns.recurente}</th>
            <th className="py-2 text-right font-semibold">{dict.perioada.columns.total}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((m) => (
            <tr key={m.label} className="border-b border-[var(--ci-border)] last:border-0">
              <td className="py-2.5 font-medium text-[var(--ci-text)] capitalize">{m.label}</td>
              <td className="ci-tabular py-2.5 text-right">{formatSuma(m.pf)}</td>
              <td className="ci-tabular py-2.5 text-right">{formatSuma(m.pj)}</td>
              <td className="ci-tabular py-2.5 text-right">{formatSuma(m.recurent)}</td>
              <td className="ci-tabular py-2.5 text-right font-semibold">{formatSuma(m.pf + m.pj + m.recurent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
