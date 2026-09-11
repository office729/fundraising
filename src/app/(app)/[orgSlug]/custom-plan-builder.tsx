"use client";

import { useMemo, useState, useTransition } from "react";

import { calculateCustomPlanPrice, normalizeCustomPlanConfig } from "@/lib/billing/custom-plan";
import { ALL_TOOLS, type ToolId } from "@/lib/billing/packages";

import { chooseCustomPlanAction } from "./billing-actions";

const TOOL_LABELS: Record<ToolId, string> = {
  "one-pager": "One-pager companii",
  "raport-companii": "Rapoarte companii",
  "newsletter-pf": "Newsletter persoane fizice",
  "newsletter-pj": "Newsletter companii",
  crm: "CRM Donatori",
  "crm-pj": "CRM Companii & Sponsorizări",
  "contract-sponsorizare": "Contracte de sponsorizare",
  "crm-pf": "CRM Beneficiari (persoană fizică)",
  "program-lucru": "Program de lucru echipă",
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

export function CustomPlanBuilder({
  orgSlug,
  activ,
  onSalvat,
}: {
  orgSlug: string;
  activ: boolean;
  onSalvat: () => void;
}) {
  const [deschis, setDeschis] = useState(activ);
  const [config, setConfig] = useState({
    utilizatori: 1,
    contactePf: 0,
    companiiPj: 0,
    generariLunare: 3,
    tools: [] as ToolId[],
  });
  const [pending, startTransition] = useTransition();
  const [trimis, setTrimis] = useState(false);

  const pret = useMemo(() => calculateCustomPlanPrice(normalizeCustomPlanConfig(config)), [config]);

  function toggleTool(tool: ToolId) {
    setConfig((c) => ({
      ...c,
      tools: c.tools.includes(tool) ? c.tools.filter((t) => t !== tool) : [...c.tools, tool],
    }));
  }

  function trimite() {
    startTransition(async () => {
      await chooseCustomPlanAction(orgSlug, config);
      setTrimis(true);
      onSalvat();
    });
  }

  return (
    <div className="relative flex flex-col gap-3 rounded-2xl border border-dashed border-brand-blue bg-panel p-6">
      <h3 className="font-display text-lg font-bold text-ink">Plan personalizat</h3>
      <p className="text-[13px] text-muted">Alege exact ce ai nevoie — prețul se calculează automat.</p>
      <p className="text-2xl font-extrabold text-ink">
        {pret} lei<span className="text-sm font-medium text-muted">/lună</span>
      </p>

      {!deschis && (
        <button
          type="button"
          onClick={() => setDeschis(true)}
          className="mt-2 rounded-md border border-brand-blue py-2.5 text-center text-sm font-bold text-brand-blue transition hover:bg-brand-blue-soft"
        >
          Configurează planul
        </button>
      )}

      {deschis && (
        <div className="flex flex-col gap-4 border-t border-line pt-3">
          <div className="grid grid-cols-2 gap-3">
            <NumberField
              label="Utilizatori"
              min={1}
              value={config.utilizatori}
              onChange={(n) => setConfig((c) => ({ ...c, utilizatori: n }))}
            />
            <NumberField
              label="Contacte PF"
              step={100}
              value={config.contactePf}
              onChange={(n) => setConfig((c) => ({ ...c, contactePf: n }))}
            />
            <NumberField
              label="Companii PJ"
              step={50}
              value={config.companiiPj}
              onChange={(n) => setConfig((c) => ({ ...c, companiiPj: n }))}
            />
            <NumberField
              label="Generări / lună"
              value={config.generariLunare}
              onChange={(n) => setConfig((c) => ({ ...c, generariLunare: n }))}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-ink">Instrumente incluse</span>
            {ALL_TOOLS.map((tool) => (
              <label key={tool} className="flex items-center gap-2 text-[13px] text-body">
                <input type="checkbox" checked={config.tools.includes(tool)} onChange={() => toggleTool(tool)} />
                {TOOL_LABELS[tool]}
              </label>
            ))}
          </div>

          <button
            type="button"
            disabled={pending}
            onClick={trimite}
            className={`rounded-md py-2.5 text-center text-sm font-bold transition disabled:opacity-60 ${
              trimis ? "bg-brand-green text-white" : "border border-brand-blue text-brand-blue hover:bg-brand-blue-soft"
            }`}
          >
            {trimis ? "Plan personalizat ales" : "Trimite planul personalizat"}
          </button>
        </div>
      )}
    </div>
  );
}
