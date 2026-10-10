"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useLocale } from "../lib/locale-context";
import { INSTRUMENTE_DICT } from "@/lib/i18n/dictionaries/instrumente";

type CategorieKey = "rapoarte" | "campanii" | "generatoare" | "documente";
type InstrumentDef = { key: string; href: string };

// Instrumentele reale din Control Tower-ul salveazaoinima.org.ro. Cele cu href
// ABSOLUT (începe cu "/") sunt instrumentele HTML reale, portate EXACT ca la
// CRM PJ (design neatins, rulate într-un iframe la /${orgSlug}/<slug> — vezi
// src/modules/crm/<slug>/); cele cu href relativ sunt reimplementări React,
// mai simple, pe date demonstrative, care mai trăiesc doar sub /crm/instrumente/<href>
// (fără echivalent HTML real portat încă).
const CATEGORII: { key: CategorieKey; culoare: string; instrumente: InstrumentDef[] }[] = [
  {
    key: "rapoarte",
    culoare: "var(--ci-green)",
    instrumente: [
      { key: "raportCompanii", href: "raport-companii" },
      { key: "scrisori", href: "scrisori" },
      { key: "certificate", href: "certificate" },
    ],
  },
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
  {
    key: "documente",
    culoare: "var(--ci-blue)",
    instrumente: [{ key: "semnaturaDigitala", href: "semnatura-digitala" }],
  },
];

// Calendar orientativ al documentelor pentru companii (în română): când are sens fiecare document și în ce ordine se lucrează cu o firmă.
const CALENDAR: [string, string][] = [
  ["Octombrie – noiembrie", "Raport de impact și scrisoare de mulțumire pentru firmele din anul curent: firmele își închid bugetele de sponsorizare și planifică anul următor. Scrisoarea de solicitare merge către firmele noi sau către cele care ar putea crește suma."],
  ["Decembrie", "Certificate de recunoștință și un bilanț al anului. Scrisoarea de confirmare se trimite după fiecare plată, indiferent de lună."],
  ["Ianuarie – februarie", "Invitații la evenimente sau la vizite de proiect; propuneri de parteneriat către firmele cu cel puțin doi ani de colaborare."],
  ["Martie – mai", "Campania de redirecționare (Declarația 177): one-pager și raport scurt, cu un termen clar. Verifică termenele în vigoare pe anaf.ro."],
  ["Iunie – septembrie", "Raport intermediar pentru proiectele în desfășurare, ca să nu fie o pauză de un an fără vești."],
  ["Oricând", "Mulțumire rapidă în 48 de ore după fiecare sprijin; certificat de participare sau de voluntariat imediat după eveniment."],
];
const SECVENTA = "Firmă nouă: telefon → scrisoare de solicitare cu one-pager (ziua 1) → follow-up (ziua 5) → telefon (ziua 10) → ofertă → contract → mulțumire rapidă (48 de ore) → actualizare (30 de zile) → raport de impact (90 de zile) → scrisoare de reînnoire (cu 90 de zile înainte de final) → certificat la final de an.";

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
                  <Link
                    key={inst.key}
                    prefetch={false}
                    href={inst.href.startsWith("/") ? `/${orgSlug}${inst.href}` : `/${orgSlug}/crm/instrumente/${inst.href}`}
                    className="group block rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4 shadow-[var(--ci-card-shadow)] transition-colors hover:border-[var(--ci-primary)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
                  >
                    <span className="mb-2 flex items-center gap-1.5 text-[12px] font-medium text-[var(--ci-text-muted)]">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: cat.culoare }} /> {catDict.nume}
                    </span>
                    <p className="text-[14px] font-semibold text-[var(--ci-text)]">{instDict.titlu}</p>
                    <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">{instDict.descriere}</p>
                    <span className="mt-3 flex items-center gap-1 text-[13px] font-medium text-[var(--ci-primary)] group-hover:underline">
                      {dict.deschide} <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}

      {locale === "ro" && (
        <details className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
          <summary className="cursor-pointer text-[14px] font-semibold text-[var(--ci-text)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">Când folosești ce: calendar anual și pașii cu o firmă</summary>
          <dl className="mt-3 space-y-2.5">
            {CALENDAR.map(([cand, ce]) => (
              <div key={cand} className="grid gap-1 sm:grid-cols-[11rem_minmax(0,1fr)]">
                <dt className="text-[13px] font-semibold text-[var(--ci-text)]">{cand}</dt>
                <dd className="text-[13px] text-[var(--ci-text-muted)]">{ce}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 border-t border-[var(--ci-border)] pt-3 text-[13px] text-[var(--ci-text-muted)]">
            <span className="font-semibold text-[var(--ci-text)]">Secvența cu o firmă. </span>
            {SECVENTA}
          </p>
        </details>
      )}
    </div>
  );
}
