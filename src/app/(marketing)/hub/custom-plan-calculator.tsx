"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { calculateCustomPlanPrice, normalizeCustomPlanConfig } from "@/lib/billing/custom-plan";
import { ALL_TOOLS, type ToolId } from "@/lib/billing/packages";
import type { Locale } from "@/lib/i18n/config";

const TOOL_LABELS: Record<Locale, Record<ToolId, string>> = {
  ro: {
    "one-pager": "One-pager companii",
    "raport-companii": "Rapoarte companii",
    "newsletter-pf": "Newsletter persoane fizice",
    "newsletter-pj": "Newsletter companii",
    crm: "CRM Donatori",
    "crm-pj": "CRM Companii & Sponsorizări",
    "contract-sponsorizare": "Contracte de sponsorizare",
    "crm-pf": "CRM Beneficiari (persoană fizică)",
    "program-lucru": "Program de lucru echipă",
  },
  en: {
    "one-pager": "Company one-pager",
    "raport-companii": "Company reports",
    "newsletter-pf": "Individual newsletter",
    "newsletter-pj": "Company newsletter",
    crm: "Donor CRM",
    "crm-pj": "Company & Sponsorship CRM",
    "contract-sponsorizare": "Sponsorship contracts",
    "crm-pf": "Beneficiary CRM (individual)",
    "program-lucru": "Team work schedule",
  },
};

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <label className="flex flex-col gap-1 text-[13px] font-medium text-ink">
      {label}
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.valueAsNumber || 0)}
        className="rounded-md border border-line bg-canvas px-3 py-2 text-sm text-ink"
      />
    </label>
  );
}

export function CustomPlanCalculator({
  locale,
  dict,
}: {
  locale: Locale;
  dict: {
    planPersonalizatTitlu: string;
    planPersonalizatDesc: string;
    planPersonalizatCampUtilizatori: string;
    planPersonalizatCampContactePf: string;
    planPersonalizatCampCompaniiPj: string;
    planPersonalizatCampGenerari: string;
    planPersonalizatInstrumenteTitlu: string;
    planPersonalizatPerLuna: string;
    planPersonalizatCta: string;
  };
}) {
  const [config, setConfig] = useState({
    utilizatori: 1,
    contactePf: 0,
    companiiPj: 0,
    generariLunare: 3,
    tools: [] as ToolId[],
  });

  const pret = useMemo(() => calculateCustomPlanPrice(normalizeCustomPlanConfig(config)), [config]);
  const toolLabels = TOOL_LABELS[locale];

  function toggleTool(tool: ToolId) {
    setConfig((c) => ({
      ...c,
      tools: c.tools.includes(tool) ? c.tools.filter((t) => t !== tool) : [...c.tools, tool],
    }));
  }

  return (
    <div className="mx-auto mb-11 max-w-[1200px] rounded-2xl border border-dashed border-brand-blue bg-panel p-7">
      <h3 className="font-display text-[22px] font-bold text-ink">{dict.planPersonalizatTitlu}</h3>
      <p className="mt-1.5 max-w-xl text-[14.5px] leading-relaxed text-muted">{dict.planPersonalizatDesc}</p>
      <p className="mt-3 text-2xl font-extrabold text-ink">
        {pret} lei<span className="text-sm font-medium text-muted">{dict.planPersonalizatPerLuna}</span>
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <NumberField
          label={dict.planPersonalizatCampUtilizatori}
          min={1}
          value={config.utilizatori}
          onChange={(n) => setConfig((c) => ({ ...c, utilizatori: n }))}
        />
        <NumberField
          label={dict.planPersonalizatCampContactePf}
          step={100}
          value={config.contactePf}
          onChange={(n) => setConfig((c) => ({ ...c, contactePf: n }))}
        />
        <NumberField
          label={dict.planPersonalizatCampCompaniiPj}
          step={50}
          value={config.companiiPj}
          onChange={(n) => setConfig((c) => ({ ...c, companiiPj: n }))}
        />
        <NumberField
          label={dict.planPersonalizatCampGenerari}
          value={config.generariLunare}
          onChange={(n) => setConfig((c) => ({ ...c, generariLunare: n }))}
        />
      </div>

      <div className="mt-5">
        <span className="text-[13px] font-medium text-ink">{dict.planPersonalizatInstrumenteTitlu}</span>
        <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {ALL_TOOLS.map((tool) => (
            <label key={tool} className="flex items-center gap-2 text-[13px] text-body">
              <input type="checkbox" checked={config.tools.includes(tool)} onChange={() => toggleTool(tool)} />
              {toolLabels[tool]}
            </label>
          ))}
        </div>
      </div>

      <Link
        href="/signup"
        className="mt-6 inline-block rounded-md border border-brand-blue px-7 py-3 text-center font-bold text-brand-blue transition hover:bg-brand-blue-soft"
      >
        {dict.planPersonalizatCta}
      </Link>
    </div>
  );
}
