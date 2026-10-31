"use client";

import { AlertOctagon, AlertTriangle, Ban, CheckCircle2, CircleDashed, Clock, Target } from "lucide-react";

import type { Locale } from "@/lib/i18n/config";
import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { ritmAsteptat, type Actualitate, type Incredere, type StareRitm } from "@/lib/performanta-masurare";

import { useLocale } from "../lib/locale-context";

// Componente vizuale comune pentru Echipă & Performanță. Starea se arată MEREU cu icon + text, nu doar cu culoare.

const STIL: Record<StareRitm, { Icon: typeof Target; clasa: string; bara: string }> = {
  in_grafic: { Icon: CheckCircle2, clasa: "bg-[var(--ci-green-soft)] text-[var(--ci-green)]", bara: "var(--ci-green)" },
  in_risc: { Icon: AlertTriangle, clasa: "bg-[var(--ci-amber-soft)] text-[var(--ci-amber)]", bara: "var(--ci-amber)" },
  intarziat: { Icon: AlertOctagon, clasa: "bg-[var(--ci-red-soft)] text-[var(--ci-red)]", bara: "var(--ci-red)" },
  finalizat: { Icon: Target, clasa: "bg-[var(--ci-blue-soft)] text-[var(--ci-blue)]", bara: "var(--ci-blue)" },
  fara_date: { Icon: CircleDashed, clasa: "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]", bara: "var(--ci-text-faint)" },
  neinceput: { Icon: Clock, clasa: "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]", bara: "var(--ci-text-faint)" },
  anulat: { Icon: Ban, clasa: "bg-[var(--ci-surface-2)] text-[var(--ci-text-faint)]", bara: "var(--ci-text-faint)" },
};

const intl = (locale: Locale) => (locale === "ro" ? "ro-RO" : "en-GB");

export function StareBadge({ stare, className = "" }: { stare: StareRitm; className?: string }) {
  const dict = PERFORMANTA_UI_DICT[useLocale()].comune;
  const { Icon, clasa } = STIL[stare];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap ${clasa} ${className}`}>
      <Icon className="size-3.5" aria-hidden />
      {dict.stare[stare]}
    </span>
  );
}

export function culoareStare(stare: StareRitm): string {
  return STIL[stare].bara;
}

// Separatorul zecimal urmează limba (virgulă în română, punct în engleză); `locale` e opțional (implicit „ro”) ca apelanții vechi să rămână neschimbați.
export const procent = (p: number | null | undefined, zecimale = 0, locale: Locale = "ro") => {
  if (p === null || p === undefined) return "—";
  const t = (p * 100).toFixed(zecimale);
  return `${locale === "ro" ? t.replace(".", ",") : t}%`;
};

export function formateazaValoare(v: number | null | undefined, unitate: string | null | undefined, locale: Locale = "ro"): string {
  if (v === null || v === undefined) return "—";
  const rotunjit = String(Math.round(v * 100) / 100);
  const nr = Math.abs(v) >= 1000 ? v.toLocaleString(intl(locale), { maximumFractionDigits: 1 }) : locale === "ro" ? rotunjit.replace(".", ",") : rotunjit;
  if (!unitate) return nr;
  return unitate === "%" ? `${nr}%` : `${nr} ${unitate}`;
}

// Bara de progres: valoarea exactă e mereu lângă ea (și în title/aria), iar o liniuță arată ritmul așteptat azi.
export function BaraProgres({
  progres,
  stare,
  perioada,
  azi,
  eticheta,
  latime = "w-32",
}: {
  progres: number | null;
  stare: StareRitm;
  perioada?: { start: string; end: string };
  azi: string;
  eticheta: string;
  latime?: string;
}) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI_DICT[locale].comune;
  const asteptat = perioada ? ritmAsteptat(perioada.start, perioada.end, azi) : null;
  const pct = progres === null ? 0 : Math.max(0, Math.min(1, progres));
  return (
    <div className="flex items-center gap-2">
      <div
        role="progressbar"
        aria-label={eticheta}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={progres === null ? undefined : Math.round(progres * 100)}
        aria-valuetext={progres === null ? dict.faraDate : `${Math.round(progres * 100)}%`}
        title={progres === null ? dict.faraDate : `${procent(progres, 1, locale)}${asteptat !== null ? dict.ritmAsteptat(Number((asteptat * 100).toFixed(0))) : ""}`}
        className={`relative h-2 ${latime} min-w-8 overflow-hidden rounded-full bg-[var(--ci-surface-2)]`}
      >
        <div className="h-full rounded-full transition-[width] motion-reduce:transition-none" style={{ width: `${pct * 100}%`, background: culoareStare(stare) }} />
        {asteptat !== null && asteptat > 0.03 && asteptat < 0.99 && <span className="absolute top-0 h-full w-0.5 bg-[var(--ci-text)]/50" style={{ left: `${asteptat * 100}%` }} aria-hidden />}
      </div>
      <span className="ci-tabular w-11 shrink-0 text-right text-[13px] font-semibold text-[var(--ci-text)]">{procent(progres, 0, locale)}</span>
    </div>
  );
}

export function ActualitateChip({ actualitate }: { actualitate: Actualitate }) {
  const dict = PERFORMANTA_UI_DICT[useLocale()].comune;
  if (actualitate === "la_zi") return <span className="text-[12px] text-[var(--ci-text-muted)]">{dict.actualitate.la_zi}</span>;
  const rau = actualitate === "veche";
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] ${actualitate === "fara_date" ? "text-[var(--ci-text-muted)]" : rau ? "font-medium text-[var(--ci-red)]" : "font-medium text-[var(--ci-amber)]"}`}>
      {actualitate !== "fara_date" && <Clock className="size-3" aria-hidden />}
      {dict.actualitate[actualitate]}
    </span>
  );
}

export function IncredereChip({ incredere }: { incredere: Incredere | null }) {
  const dict = PERFORMANTA_UI_DICT[useLocale()].comune;
  if (!incredere) return null;
  return <span className="rounded-full border border-[var(--ci-border)] px-1.5 py-px text-[11px] text-[var(--ci-text-muted)]">{dict.incredere[incredere]}</span>;
}

export const dataScurta = (iso: string | null | undefined, locale: Locale = "ro") => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(intl(locale), { day: "2-digit", month: "short" }) : "—");
export const dataCompleta = (iso: string | null | undefined, locale: Locale = "ro") => (iso ? new Date(iso).toLocaleDateString(intl(locale), { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
export const dataOra = (iso: string, locale: Locale = "ro") => new Date(iso).toLocaleString(intl(locale), { timeZone: "Europe/Bucharest", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

// Eticheta perioadei în limba curentă: în română rămâne cea din lib (ex. „T3 2026 (iul–sep)”), în engleză se reface din cod („2026-T3”, „an-2026”).
export function etichetaPerioada(p: { cod?: string; tip?: string; eticheta: string }, locale: Locale): string {
  if (locale === "ro") return p.eticheta;
  // Perioada anterioară din prezentare vine doar cu eticheta (ex. „T3 2026 (iul–sep)”, „Anul 2025”): codul se deduce din ea.
  let cod = p.cod ?? "";
  if (!cod) {
    const q = /^T([1-4]) (\d{4})/.exec(p.eticheta);
    const y = /^Anul (\d{4})/.exec(p.eticheta);
    cod = q ? `${q[2]}-T${q[1]}` : y ? `an-${y[1]}` : "";
  }
  const t = /^(\d{4})-T([1-4])$/.exec(cod);
  if (t) {
    const luna = (n: number) => new Date(Date.UTC(Number(t[1]), n, 1)).toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
    const start = (Number(t[2]) - 1) * 3;
    return `Q${t[2]} ${t[1]} (${luna(start)}–${luna(start + 2)})`;
  }
  const a = /^an-(\d{4})$/.exec(cod);
  return a ? PERFORMANTA_UI_DICT.en.comune.anPerioada(a[1]) : p.eticheta;
}
