"use client";

import Link from "next/link";
import { useState } from "react";

import type { Locale } from "@/lib/i18n/config";

type Plan = {
  nume: string;
  tag: string;
  pret: string; // ex. "49 lei" — prețul lunar
  citat: string;
  desc: string;
  cta: string;
  popular?: boolean;
  items: string[];
};

type Texte = {
  facturareTitlu: string;
  facturareLunar: string;
  facturareAnual: string;
  facturareReducere: string;
  perLuna: string;
  perAn: string;
  pretFinalLabel: string;
  echivalentLunar: string;
  facturatAnual: string;
  facturatLunar: string;
  popularBadge: string;
};

const PLAN_KEYS = ["start", "crestere", "impact"] as const;
// 2 luni gratuite: anual = 10 x prețul lunar (49→490, 149→1.490, 299→2.990, ca în lib/billing/packages.ts).
const LUNI_PLATITE_ANUAL = 10;

export function PlansSection({ plans, texte, locale }: { plans: Plan[]; texte: Texte; locale: Locale }) {
  const [anual, setAnual] = useState(true);
  const fmt = (n: number) => n.toLocaleString(locale === "ro" ? "ro-RO" : "en-US", { maximumFractionDigits: 0 });

  return (
    <div>
      <div className="mx-auto mb-8 flex max-w-[1200px] flex-col items-center gap-3">
        <p className="text-[13px] font-semibold text-muted">{texte.facturareTitlu}</p>
        <div role="group" aria-label={texte.facturareTitlu} className="inline-flex rounded-full border border-line bg-panel p-1">
          <button
            type="button"
            onClick={() => setAnual(false)}
            aria-pressed={!anual}
            className={`rounded-full px-5 py-2 text-sm font-bold transition ${anual ? "text-muted hover:text-ink" : "bg-brand-blue text-white"}`}
          >
            {texte.facturareLunar}
          </button>
          <button
            type="button"
            onClick={() => setAnual(true)}
            aria-pressed={anual}
            className={`flex items-center gap-2 rounded-full px-5 py-2 text-sm font-bold transition ${anual ? "bg-brand-blue text-white" : "text-muted hover:text-ink"}`}
          >
            {texte.facturareAnual}
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${anual ? "bg-white/20 text-white" : "bg-brand-green-soft text-brand-green"}`}>
              {texte.facturareReducere}
            </span>
          </button>
        </div>
      </div>

      <div className="mx-auto mb-11 grid max-w-[1200px] grid-cols-1 items-stretch gap-[22px] md:grid-cols-3">
        {plans.map((plan, i) => {
          const lunar = parseInt(plan.pret, 10);
          const total = anual ? lunar * LUNI_PLATITE_ANUAL : lunar;
          return (
            <div
              key={plan.nume}
              className={`relative flex flex-col gap-3.5 rounded-2xl border bg-panel p-7 ${
                plan.popular ? "border-2 border-brand-green shadow-[0_12px_32px_rgba(63,168,92,0.16)]" : "border-line"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-green px-4 py-1 text-xs font-extrabold tracking-wide whitespace-nowrap text-white">
                  {texte.popularBadge}
                </div>
              )}
              <div className="text-[12.5px] font-extrabold tracking-wide text-brand-green uppercase">{plan.tag}</div>
              <h3 className="font-display text-[22px] font-bold text-ink">{plan.nume}</h3>
              <div>
                <p className="text-[12px] font-bold tracking-wide text-muted-2 uppercase">{texte.pretFinalLabel}</p>
                <p className="font-display text-[30px] leading-tight font-extrabold text-ink">
                  {fmt(total)} lei
                  <span className="text-base font-semibold text-muted">{anual ? texte.perAn : texte.perLuna}</span>
                </p>
                <p className="mt-0.5 text-[12.5px] text-muted">
                  {anual ? `${texte.facturatAnual} · ${texte.echivalentLunar.replace("{x}", fmt(Math.round((total / 12) * 10) / 10))}` : texte.facturatLunar}
                </p>
              </div>
              <p className="text-[15px] leading-relaxed text-ink italic">&bdquo;{plan.citat}&rdquo;</p>
              <p className="text-[14.5px] leading-relaxed text-muted">{plan.desc}</p>
              <div className="flex flex-1 flex-col gap-2 border-t border-line pt-3.5">
                {plan.items.map((item) => (
                  <div key={item} className="flex gap-2 text-[13.5px] leading-relaxed text-body">
                    <span className="flex-none font-extrabold text-brand-green">✓</span>
                    {item}
                  </div>
                ))}
              </div>
              <Link
                href={`/signup?plan=${PLAN_KEYS[i]}&billing=${anual ? "anual" : "lunar"}`}
                className={`rounded-md py-3 text-center font-bold transition ${
                  plan.popular
                    ? "bg-brand-green text-white hover:bg-brand-green-hover"
                    : "border-[1.5px] border-brand-blue text-brand-blue hover:bg-brand-blue hover:text-white"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
