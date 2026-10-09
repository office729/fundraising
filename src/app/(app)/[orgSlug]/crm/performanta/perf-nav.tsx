"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { perioadaVecina, rezolvaPerioada } from "@/lib/performanta-perioada";

const FILE = [
  { sub: "", label: "Prezentare generală" },
  { sub: "/obiective", label: "Obiective și rezultate" },
];

// Navigarea modulului Echipă & Performanță. Perioada și filtrele rămân în adresă când treci de la o filă la alta.
export function PerfNav({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname() ?? "";
  const sp = useSearchParams();
  const baza = `/${orgSlug}/crm/performanta`;
  const pastreaza = new URLSearchParams();
  const perioada = sp.get("perioada");
  if (perioada) pastreaza.set("perioada", perioada);
  const coada = pastreaza.toString() ? `?${pastreaza.toString()}` : "";
  return (
    <nav aria-label="Echipă și performanță" className="ci-scrollbar flex gap-1 overflow-x-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1">
      {FILE.map((t) => {
        const href = `${baza}${t.sub}`;
        const activ = t.sub === "" ? pathname === baza : pathname.startsWith(href);
        return (
          <Link
            key={t.sub}
            href={`${href}${coada}`}
            prefetch={false}
            aria-current={activ ? "page" : undefined}
            className={`shrink-0 rounded-[calc(var(--ci-radius-card)-4px)] px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${
              activ ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

// Alegerea perioadei: trimestru sau an, cu săgeți către perioada anterioară / următoare. Se păstrează celelalte filtre din adresă.
export function SelectorPerioada() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const p = rezolvaPerioada(sp.get("perioada"));
  const muta = (cod: string) => {
    const n = new URLSearchParams(sp.toString());
    n.set("perioada", cod);
    router.replace(`${pathname}?${n.toString()}`, { scroll: false });
  };
  const schimbaTip = (tip: "trimestru" | "an") => {
    if (tip === p.tip) return;
    muta(tip === "an" ? `an-${p.start.slice(0, 4)}` : rezolvaPerioada(null, p.start.slice(0, 4) + "-" + p.start.slice(5, 7) + "-01").cod);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
        <button type="button" aria-label="Perioada anterioară" onClick={() => muta(perioadaVecina(p, -1).cod)} className="rounded-l-[var(--ci-radius-btn)] p-2 text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <span className="ci-tabular min-w-[9.5rem] px-2 text-center text-[13px] font-semibold text-[var(--ci-text)]" aria-live="polite">
          {p.eticheta}
        </span>
        <button type="button" aria-label="Perioada următoare" onClick={() => muta(perioadaVecina(p, 1).cod)} className="rounded-r-[var(--ci-radius-btn)] p-2 text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
      <div role="group" aria-label="Tipul perioadei" className="flex rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-0.5">
        {(["trimestru", "an"] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={p.tip === t}
            onClick={() => schimbaTip(t)}
            className={`rounded-[calc(var(--ci-radius-btn)-2px)] px-2.5 py-1 text-[12.5px] font-medium focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${p.tip === t ? "bg-[var(--ci-surface-2)] text-[var(--ci-text)]" : "text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]"}`}
          >
            {t === "trimestru" ? "Trimestru" : "An"}
          </button>
        ))}
      </div>
    </div>
  );
}
