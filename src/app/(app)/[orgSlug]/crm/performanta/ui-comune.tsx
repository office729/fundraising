"use client";

import { AlertOctagon, AlertTriangle, Ban, CheckCircle2, CircleDashed, Clock, Target } from "lucide-react";

import {
  ETICHETE_ACTUALITATE,
  ETICHETE_INCREDERE,
  ETICHETE_STARE,
  ritmAsteptat,
  type Actualitate,
  type Incredere,
  type StareRitm,
} from "@/lib/performanta-masurare";

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

export function StareBadge({ stare, className = "" }: { stare: StareRitm; className?: string }) {
  const { Icon, clasa } = STIL[stare];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap ${clasa} ${className}`}>
      <Icon className="size-3.5" aria-hidden />
      {ETICHETE_STARE[stare]}
    </span>
  );
}

export function culoareStare(stare: StareRitm): string {
  return STIL[stare].bara;
}

export const procent = (p: number | null | undefined, zecimale = 0) => (p === null || p === undefined ? "—" : `${(p * 100).toFixed(zecimale).replace(".", ",")}%`);

export function formateazaValoare(v: number | null | undefined, unitate: string | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const nr = Math.abs(v) >= 1000 ? v.toLocaleString("ro-RO", { maximumFractionDigits: 1 }) : String(Math.round(v * 100) / 100).replace(".", ",");
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
        aria-valuetext={progres === null ? "Fără date" : `${Math.round(progres * 100)}%`}
        title={progres === null ? "Fără date" : `${(progres * 100).toFixed(1).replace(".", ",")}%${asteptat !== null ? ` · ritm așteptat azi ${(asteptat * 100).toFixed(0)}%` : ""}`}
        className={`relative h-2 ${latime} min-w-8 overflow-hidden rounded-full bg-[var(--ci-surface-2)]`}
      >
        <div className="h-full rounded-full transition-[width] motion-reduce:transition-none" style={{ width: `${pct * 100}%`, background: culoareStare(stare) }} />
        {asteptat !== null && asteptat > 0.03 && asteptat < 0.99 && <span className="absolute top-0 h-full w-0.5 bg-[var(--ci-text)]/50" style={{ left: `${asteptat * 100}%` }} aria-hidden />}
      </div>
      <span className="ci-tabular w-11 shrink-0 text-right text-[13px] font-semibold text-[var(--ci-text)]">{procent(progres)}</span>
    </div>
  );
}

export function ActualitateChip({ actualitate }: { actualitate: Actualitate }) {
  if (actualitate === "la_zi") return <span className="text-[12px] text-[var(--ci-text-muted)]">{ETICHETE_ACTUALITATE.la_zi}</span>;
  const rau = actualitate === "veche";
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] ${actualitate === "fara_date" ? "text-[var(--ci-text-muted)]" : rau ? "font-medium text-[var(--ci-red)]" : "font-medium text-[var(--ci-amber)]"}`}>
      {actualitate !== "fara_date" && <Clock className="size-3" aria-hidden />}
      {ETICHETE_ACTUALITATE[actualitate]}
    </span>
  );
}

export function IncredereChip({ incredere }: { incredere: Incredere | null }) {
  if (!incredere) return null;
  return <span className="rounded-full border border-[var(--ci-border)] px-1.5 py-px text-[11px] text-[var(--ci-text-muted)]">{ETICHETE_INCREDERE[incredere]}</span>;
}

export const dataScurta = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("ro-RO", { day: "2-digit", month: "short" }) : "—");
export const dataCompleta = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleDateString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "2-digit", year: "numeric" }) : "—");
export const dataOra = (iso: string) => new Date(iso).toLocaleString("ro-RO", { timeZone: "Europe/Bucharest", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
