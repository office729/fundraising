"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";

import { trackEvent } from "@/lib/analytics";
import { calculateCustomPlanBreakdown, type CustomPlanBreakdownKey } from "@/lib/billing/custom-plan";
import { ALL_TOOLS, PACKAGE_LIMITS, type ToolId } from "@/lib/billing/packages";

import { startCustomCheckoutAction } from "./billing-actions";

const TOOL_LABELS: Record<ToolId, string> = {
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
};

const BREAKDOWN_LABELS: Record<CustomPlanBreakdownKey, string> = {
  baza: "Bază (cont + platformă)",
  utilizatori: "Utilizatori suplimentari",
  contactePf: "Contacte PF",
  companiiPj: "Companii PJ",
  instrumente: "Instrumente alese",
  generari: "Generări suplimentare",
  accesDesignToate: "Acces la toate design-urile de campanie",
};

const FIXED_PACKAGES: { key: "start" | "crestere" | "impact"; nume: string }[] = [
  { key: "start", nume: "START" },
  { key: "crestere", nume: "CREȘTERE" },
  { key: "impact", nume: "IMPACT" },
];

function compararePachetFix(pret: number): string | null {
  const preturi = FIXED_PACKAGES.map((p) => ({ ...p, pret: PACKAGE_LIMITS[p.key].pretLunar! }));
  const apropiat = preturi.reduce((a, b) => (Math.abs(b.pret - pret) < Math.abs(a.pret - pret) ? b : a));
  const delta = Math.abs(apropiat.pret - pret);
  if (delta === 0) return null;
  return pret < apropiat.pret
    ? `cu ${delta} lei mai puțin decât pachetul ${apropiat.nume}`
    : `cu ${delta} lei mai mult decât pachetul ${apropiat.nume}`;
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

export function CustomPlanBuilder({ orgSlug }: { orgSlug: string }) {
  const [config, setConfig] = useState({
    utilizatori: 1,
    contactePf: 0,
    companiiPj: 0,
    generariLunare: 3,
    tools: [] as ToolId[],
    accesDesignToate: false,
  });
  const [pending, startTransition] = useTransition();
  const [eroare, setEroare] = useState<string | null>(null);

  const breakdown = useMemo(() => calculateCustomPlanBreakdown(config), [config]);
  const pret = breakdown.reduce((sum, item) => sum + item.amount, 0);
  const comparatie = useMemo(() => compararePachetFix(pret), [pret]);

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

  function trimite() {
    setEroare(null);
    startTransition(async () => {
      try {
        const { url } = await startCustomCheckoutAction(orgSlug, config);
        trackEvent("begin_checkout", {
          currency: "RON",
          value: pret,
          items: [{ item_name: "Plan personalizat", quantity: 1 }],
          transport_type: "beacon",
        });
        window.location.href = url;
      } catch {
        setEroare("Nu am putut porni plata — încearcă din nou sau scrie-ne la vlad.placinta@alexandrit.ro.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-dashed border-brand-blue bg-panel p-7 sm:p-9">
      <h3 className="font-display text-[22px] font-bold text-ink">Plan personalizat</h3>
      <p className="mt-1.5 max-w-xl text-[14.5px] leading-relaxed text-muted">
        Alege exact ce ai nevoie — prețul se calculează automat.
      </p>

      <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-7">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <SliderField
              label="Utilizatori"
              min={1}
              max={20}
              step={1}
              value={config.utilizatori}
              onChange={(n) => setConfig((c) => ({ ...c, utilizatori: n }))}
              format={(n) => `${n}`}
            />
            <SliderField
              label="Contacte PF"
              min={0}
              max={50_000}
              step={500}
              value={config.contactePf}
              onChange={(n) => setConfig((c) => ({ ...c, contactePf: n }))}
              format={(n) => n.toLocaleString("ro-RO")}
            />
            <SliderField
              label="Companii PJ"
              min={0}
              max={10_000}
              step={100}
              value={config.companiiPj}
              onChange={(n) => setConfig((c) => ({ ...c, companiiPj: n }))}
              format={(n) => n.toLocaleString("ro-RO")}
            />
            <SliderField
              label="Generări / lună"
              min={0}
              max={100}
              step={1}
              value={config.generariLunare}
              onChange={(n) => setConfig((c) => ({ ...c, generariLunare: n }))}
              format={(n) => `${n}`}
            />
          </div>

          <div>
            <span className="text-[13px] font-medium text-ink">Instrumente incluse</span>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {ALL_TOOLS.map((tool) => {
                const toolActiv = config.tools.includes(tool);
                return (
                  <button
                    key={tool}
                    type="button"
                    onClick={() => toggleTool(tool)}
                    aria-pressed={toolActiv}
                    className={`rounded-full border px-3.5 py-1.5 text-[12.5px] font-medium transition ${
                      toolActiv
                        ? "border-brand-green bg-brand-green-soft text-brand-green"
                        : "border-line text-body hover:border-brand-blue hover:text-brand-blue"
                    }`}
                  >
                    {toolActiv ? "✓ " : ""}
                    {TOOL_LABELS[tool]}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="text-[13px] font-medium text-ink">Design-uri de campanie</span>
            <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
              Implicit vezi doar design-urile potrivite domeniului de activitate ales în Setări. Activează asta ca
              să alegi din toate design-urile, indiferent de domeniu.
            </p>
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
                {config.accesDesignToate ? "✓ " : ""}Acces la toate design-urile
              </button>
            </div>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-line bg-canvas p-5">
            <p
              className={`text-3xl font-extrabold transition-colors duration-300 ${puls ? "text-brand-green" : "text-ink"}`}
            >
              {pret} lei<span className="text-sm font-medium text-muted">/lună</span>
            </p>
            {comparatie && <p className="mt-1 text-[12.5px] text-muted">{comparatie}</p>}

            <div className="mt-4 flex flex-col gap-1.5 border-t border-line pt-4">
              {breakdown.map((item) => (
                <div key={item.key} className="flex items-center justify-between text-[13px] text-body">
                  <span>{BREAKDOWN_LABELS[item.key]}</span>
                  <span className="font-medium text-ink">+{item.amount} lei</span>
                </div>
              ))}
            </div>

            {eroare && <p className="mt-3 text-[13px] text-red-600">{eroare}</p>}

            <button
              type="button"
              disabled={pending}
              onClick={trimite}
              className="mt-5 w-full rounded-md bg-brand-green py-3 text-center text-sm font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-60"
            >
              {pending ? "Se redirecționează..." : "Continuă la plată"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
