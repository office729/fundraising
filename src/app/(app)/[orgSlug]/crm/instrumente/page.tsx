"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useLocale } from "../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";

type CategorieKey = "rapoarte" | "campanii" | "generatoare";
type InstrumentDef = { key: string; href: string };

// Instrumentele reale din Control Tower-ul salveazaoinima.org.ro. Cele cu href
// ABSOLUT (începe cu "/") sunt instrumentele HTML reale, portate EXACT ca la
// CRM PJ (design neatins, rulate într-un iframe la /${orgSlug}/<slug> — vezi
// src/modules/crm/<slug>/); cele cu href relativ sunt reimplementări React,
// mai simple, pe date demonstrative, care mai trăiesc doar sub /crm/instrumente/<href>
// (fără echivalent HTML real portat încă).
const CATEGORII: { key: CategorieKey; culoare: string; instrumente: InstrumentDef[] }[] = [
  {
    key: "campanii",
    culoare: "var(--ci-purple)",
    instrumente: [
      { key: "newsletterPf", href: "/newsletter-pf" },
      { key: "newsletterPj", href: "/newsletter-pj" },
    ],
  },
  {
    key: "generatoare",
    culoare: "var(--ci-red)",
    instrumente: [{ key: "onePagerGenerator", href: "/one-pager-generator" }],
  },
];

export default function InstrumentePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const locale = useLocale();
  const dict = INSTRUMENTE_DICT[locale].index;

  return (
    <div className="mx-auto max-w-[1200px] space-y-8">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{dict.title}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dict.subtitle}</p>
      </div>

      {CATEGORII.map((cat) => {
        const catDict = dict.categorii[cat.key];
        return (
          <div key={cat.key}>
            <div className="mb-3 flex items-center gap-2">
              <h2 className="text-[15px] font-bold text-[var(--ci-text)]">{catDict.nume}</h2>
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--ci-surface-2)] px-1.5 text-[11px] font-semibold text-[var(--ci-text-muted)]">
                {cat.instrumente.length}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cat.instrumente.map((inst) => {
                const instDict = (catDict.instrumente as Record<string, { titlu: string; descriere: string }>)[inst.key];
                return (
                  <div key={inst.key} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4 shadow-[var(--ci-card-shadow)]">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[12px] font-medium" style={{ color: cat.culoare }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.culoare }} /> {catDict.nume.split(" ")[0]}
                      </span>
                      <span className="rounded-full bg-[var(--ci-green-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--ci-green)]">{dict.disponibil}</span>
                    </div>
                    <p className="text-[14px] font-semibold text-[var(--ci-text)]">{instDict.titlu}</p>
                    <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{instDict.descriere}</p>
                    <Link
                      href={inst.href.startsWith("/") ? `/${orgSlug}${inst.href}` : `/${orgSlug}/crm/instrumente/${inst.href}`}
                      className="mt-3 flex items-center gap-1 text-[13px] font-medium text-[var(--ci-primary)] hover:underline"
                    >
                      {dict.deschide} <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

    </div>
  );
}
