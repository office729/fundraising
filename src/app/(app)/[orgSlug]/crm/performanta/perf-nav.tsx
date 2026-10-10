"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Fragment, useEffect, useState } from "react";

import { perioadaVecina, rezolvaPerioada } from "@/lib/performanta-perioada";

import { numarNotificariNecitite } from "./automatizari-actions";
import { useCalePerf } from "./perf-cale";

// Filele „secundare” (rapoarte, ținte, automatizări) se folosesc rar: stau după un separator, ca lucrul zilnic să iasă în față.
const FILE: { sub: string; label: string; secundar?: boolean }[] = [
  { sub: "", label: "Prezentare generală" },
  { sub: "/spatiul-meu", label: "Spațiul meu" },
  { sub: "/obiective", label: "Obiective și rezultate" },
  { sub: "/saptamana", label: "Planul săptămânii" },
  { sub: "/echipa", label: "Echipa" },
  { sub: "/discutii", label: "Discuții și evaluări" },
  { sub: "/rapoarte", label: "Rapoarte", secundar: true },
  { sub: "/sabloane", label: "Ținte șabloane", secundar: true },
  { sub: "/automatizari", label: "Automatizări", secundar: true },
];

// Navigarea modulului Echipă & Performanță. Perioada și filtrele rămân în adresă când treci de la o filă la alta.
export function PerfNav({ orgSlug }: { orgSlug: string }) {
  const pathname = usePathname() ?? "";
  const sp = useSearchParams();
  const { demo, baza } = useCalePerf(orgSlug);
  const pastreaza = new URLSearchParams();
  const perioada = sp.get("perioada");
  if (perioada) pastreaza.set("perioada", perioada);
  const coada = pastreaza.toString() ? `?${pastreaza.toString()}` : "";
  const [necitite, setNecitite] = useState(0);
  // Numărul de notificări necitite se reîncarcă la fiecare schimbare de pagină din modul.
  useEffect(() => {
    if (demo) return; // modul demonstrativ nu citește nimic din datele organizației
    let anulat = false;
    numarNotificariNecitite(orgSlug)
      .then((n) => !anulat && setNecitite(n))
      .catch(() => {});
    return () => {
      anulat = true;
    };
  }, [orgSlug, pathname, demo]);
  const necititeAfisate = demo ? 2 : necitite;
  return (
    <>
    {demo && (
      <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--ci-radius-card)] border border-[var(--ci-purple)]/30 bg-[var(--ci-purple-soft)] px-4 py-2.5 text-[13px] text-[var(--ci-purple)]">
        <p>
          <strong>Mod demonstrativ.</strong> Toate datele sunt fictive și nu vin din organizația ta. Nu se salvează nimic, iar exporturile sunt oprite. Filtrele de pe server (perioadă, departament) nu se aplică aici.
        </p>
        <Link href={`/${orgSlug}/crm/performanta`} prefetch={false} className="font-semibold underline underline-offset-2">
          Ieși din demo
        </Link>
      </div>
    )}
    <nav aria-label="Echipă și performanță" className="ci-scrollbar flex gap-1 overflow-x-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-1">
      {FILE.map((t, i) => {
        const href = `${baza}${t.sub}`;
        const activ = t.sub === "" ? pathname === baza : pathname.startsWith(href);
        return (
          <Fragment key={t.sub}>
          {t.secundar && !FILE[i - 1]?.secundar && <span aria-hidden className="mx-1 my-1 w-px shrink-0 bg-[var(--ci-border)]" />}
          <Link
            href={`${href}${coada}`}
            prefetch={false}
            aria-current={activ ? "page" : undefined}
            className={`shrink-0 rounded-[calc(var(--ci-radius-card)-4px)] px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${
              activ ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
            }`}
          >
            {t.label}
          </Link>
          </Fragment>
        );
      })}
      <Link href={`${baza}/notificari`} prefetch={false} aria-current={pathname.startsWith(`${baza}/notificari`) ? "page" : undefined} className={`shrink-0 rounded-[calc(var(--ci-radius-card)-4px)] px-3.5 py-1.5 text-[13px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${pathname.startsWith(`${baza}/notificari`) ? "bg-[var(--ci-primary)] text-white" : "text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"}`}>
        Notificări
        {necititeAfisate > 0 && <span className="ci-tabular ml-1.5 rounded-full bg-[var(--ci-red)] px-1.5 py-px text-[11px] font-semibold text-white"><span className="sr-only">{necititeAfisate} necitite</span><span aria-hidden>{necititeAfisate > 99 ? "99+" : necititeAfisate}</span></span>}
      </Link>
      {!demo && (
        <Link href={`/${orgSlug}/crm/performanta/demo`} prefetch={false} className="ml-auto shrink-0 rounded-[calc(var(--ci-radius-card)-4px)] border border-dashed border-[var(--ci-border-strong)] px-3.5 py-1.5 text-[13px] font-semibold text-[var(--ci-purple)] transition-colors hover:bg-[var(--ci-purple-soft)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
          Exemplu demonstrativ
        </Link>
      )}
    </nav>
    </>
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
