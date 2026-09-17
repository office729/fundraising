"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

import { calculateCustomPlanBreakdown, normalizeCustomPlanConfig, type CustomPlanBreakdownKey } from "@/lib/billing/custom-plan";
import { ALL_TOOLS, PACKAGE_LIMITS, type ToolId } from "@/lib/billing/packages";
import { planQueryString } from "@/lib/billing/plan-query";
import type { Locale } from "@/lib/i18n/config";

const TOOL_LABELS: Record<Locale, Record<ToolId, string>> = {
  ro: {
    "one-pager": "One-pager companii",
    "one-pager-generator": "Generator one-pager",
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
    "one-pager-generator": "One-pager generator",
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

const BREAKDOWN_LABELS: Record<Locale, Record<CustomPlanBreakdownKey, string>> = {
  ro: {
    baza: "Bază (cont + platformă)",
    utilizatori: "Utilizatori suplimentari",
    contactePf: "Contacte PF",
    companiiPj: "Companii PJ",
    instrumente: "Instrumente alese",
    generari: "Generări suplimentare",
    accesDesignToate: "Acces la toate design-urile de campanie",
  },
  en: {
    baza: "Base (account + platform)",
    utilizatori: "Extra users",
    contactePf: "Individual contacts",
    companiiPj: "Companies",
    instrumente: "Selected tools",
    generari: "Extra generations",
    accesDesignToate: "Access to all campaign designs",
  },
};

const FIXED_PACKAGES: { key: "start" | "crestere" | "impact"; nume: string }[] = [
  { key: "start", nume: "START" },
  { key: "crestere", nume: "CREȘTERE" },
  { key: "impact", nume: "IMPACT" },
];

function compararePachetFix(pret: number, locale: Locale): string | null {
  const preturi = FIXED_PACKAGES.map((p) => ({ ...p, pret: PACKAGE_LIMITS[p.key].pretLunar! }));
  // Cel mai apropiat pachet fix, ca ancoră de preț — nu cea mai ieftină/scumpă opțiune.
  const apropiat = preturi.reduce((a, b) => (Math.abs(b.pret - pret) < Math.abs(a.pret - pret) ? b : a));
  const delta = Math.abs(apropiat.pret - pret);
  if (delta === 0) return null;
  const maiPutin = pret < apropiat.pret;
  if (locale === "en") {
    return maiPutin
      ? `${delta} lei/month less than ${apropiat.nume}`
      : `${delta} lei/month more than ${apropiat.nume}`;
  }
  return maiPutin ? `cu ${delta} lei mai puțin decât pachetul ${apropiat.nume}` : `cu ${delta} lei mai mult decât pachetul ${apropiat.nume}`;
}

function SliderField({
  label,
  value,
  onChange,
  min,
  max,
  step,
  format,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
  format: (n: number) => string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        <span className="font-display text-[15px] font-bold text-brand-blue">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-line accent-brand-green"
      />
    </div>
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
    planPersonalizatAccesDesignTitlu: string;
    planPersonalizatAccesDesignDesc: string;
    planPersonalizatAccesDesignLabel: string;
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
    accesDesignToate: false,
  });

  const normalized = useMemo(() => normalizeCustomPlanConfig(config), [config]);
  const breakdown = useMemo(() => calculateCustomPlanBreakdown(normalized), [normalized]);
  const pret = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const comparatie = useMemo(() => compararePachetFix(pret, locale), [pret, locale]);

  // Transportă configurația spre /signup ca query params — signupAction o
  // înregistrează direct pe organizația nou creată (aceeași normalizare +
  // recalculare de preț server-side ca la chooseCustomPlanAction). Fără
  // asta, alegerile de aici s-ar pierde la click pe CTA (era exact gaura
  // semnalată: pagina publică nu ducea planul mai departe la signup).
  const signupHref = useMemo(() => {
    const query = planQueryString({
      plan: "custom",
      utilizatori: String(config.utilizatori),
      contactePf: String(config.contactePf),
      companiiPj: String(config.companiiPj),
      generariLunare: String(config.generariLunare),
      tools: config.tools.join(","),
      accesDesignToate: config.accesDesignToate ? "1" : "0",
    });
    return `/signup?${query}`;
  }, [config]);
  const toolLabels = TOOL_LABELS[locale];
  const breakdownLabels = BREAKDOWN_LABELS[locale];

  // Puls scurt de culoare pe preț la fiecare schimbare — feedback "live" fără librărie de animație.
  const [puls, setPuls] = useState(false);
  const primulRandăr = useRef(true);
  useEffect(() => {
    if (primulRandăr.current) {
      primulRandăr.current = false;
      return;
    }
    setPuls(true);
    const t = setTimeout(() => setPuls(false), 400);
    return () => clearTimeout(t);
  }, [pret]);

  function toggleTool(tool: ToolId) {
    setConfig((c) => ({
      ...c,
      tools: c.tools.includes(tool) ? c.tools.filter((t) => t !== tool) : [...c.tools, tool],
    }));
  }

  return (
    <div className="mx-auto mb-11 max-w-[1200px] rounded-2xl border border-dashed border-brand-blue bg-panel p-7 sm:p-9">
      <h3 className="font-display text-[26px] font-bold text-ink">{dict.planPersonalizatTitlu}</h3>
      <p className="mt-1.5 max-w-xl text-[14.5px] leading-relaxed text-muted">{dict.planPersonalizatDesc}</p>

      <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        {/* Controale */}
        <div className="flex flex-col gap-7">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <SliderField
              label={dict.planPersonalizatCampUtilizatori}
              min={1}
              max={20}
              step={1}
              value={config.utilizatori}
              onChange={(n) => setConfig((c) => ({ ...c, utilizatori: n }))}
              format={(n) => `${n}`}
            />
            <SliderField
              label={dict.planPersonalizatCampContactePf}
              min={0}
              max={50_000}
              step={500}
              value={config.contactePf}
              onChange={(n) => setConfig((c) => ({ ...c, contactePf: n }))}
              format={(n) => n.toLocaleString(locale === "ro" ? "ro-RO" : "en-US")}
            />
            <SliderField
              label={dict.planPersonalizatCampCompaniiPj}
              min={0}
              max={10_000}
              step={100}
              value={config.companiiPj}
              onChange={(n) => setConfig((c) => ({ ...c, companiiPj: n }))}
              format={(n) => n.toLocaleString(locale === "ro" ? "ro-RO" : "en-US")}
            />
            <SliderField
              label={dict.planPersonalizatCampGenerari}
              min={0}
              max={100}
              step={1}
              value={config.generariLunare}
              onChange={(n) => setConfig((c) => ({ ...c, generariLunare: n }))}
              format={(n) => `${n}`}
            />
          </div>

          <div>
            <span className="text-[13px] font-medium text-ink">{dict.planPersonalizatInstrumenteTitlu}</span>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {ALL_TOOLS.map((tool) => {
                const activ = config.tools.includes(tool);
                return (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => toggleTool(tool)}
                    aria-pressed={activ}
                    className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition ${
                      activ
                        ? "border-brand-green bg-brand-green-soft text-brand-green"
                        : "border-line text-body hover:border-brand-blue hover:text-brand-blue"
                    }`}
                  >
                    {activ ? "✓ " : ""}
                    {toolLabels[tool]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-[13px] font-medium text-ink">{dict.planPersonalizatAccesDesignTitlu}</span>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">{dict.planPersonalizatAccesDesignDesc}</p>
            <div className="mt-2.5">
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, accesDesignToate: !c.accesDesignToate }))}
                aria-pressed={config.accesDesignToate}
                className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition ${
                  config.accesDesignToate
                    ? "border-brand-green bg-brand-green-soft text-brand-green"
                    : "border-line text-body hover:border-brand-blue hover:text-brand-blue"
                }`}
              >
                {config.accesDesignToate ? "✓ " : ""}
                {dict.planPersonalizatAccesDesignLabel}
              </button>
            </div>
          </div>
        </div>

        {/* Sumar */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-line bg-canvas p-5">
            <p
              className={`text-3xl font-extrabold transition-colors duration-300 ${puls ? "text-brand-green" : "text-ink"}`}
            >
              {pret} lei<span className="text-sm font-medium text-muted">{dict.planPersonalizatPerLuna}</span>
            </p>
            {comparatie && <p className="mt-1 text-[12.5px] text-muted">{comparatie}</p>}

            <div className="mt-4 flex flex-col gap-1.5 border-t border-line pt-4">
              {breakdown.map((item) => (
                <div key={item.key} className="flex items-center justify-between text-[13px] text-body">
                  <span>{breakdownLabels[item.key]}</span>
                  <span className="font-medium text-ink">+{item.amount} lei</span>
                </div>
              ))}
            </div>

            <Link
              href={signupHref}
              className="mt-5 block rounded-md bg-brand-green py-3 text-center font-bold text-white transition hover:bg-brand-green-hover"
            >
              {dict.planPersonalizatCta}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
