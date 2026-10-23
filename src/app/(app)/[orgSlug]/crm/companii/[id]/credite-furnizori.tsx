"use client";

import { useEffect, useState } from "react";

import { NUME_CONECTOR } from "@/lib/prospectare/motor";

import { creditePrelucrare, type CreditFurnizor } from "./prospectare-actions";

// Marcă simplă pentru fiecare instrument (inițială pe culoarea lui), ca să se recunoască dintr-o privire; nu sunt siglele oficiale.
const MARCA: Record<CreditFurnizor["furnizor"], { initiala: string; fundal: string; text: string }> = {
  lusha: { initiala: "L", fundal: "#6d3df2", text: "#ffffff" },
  apollo: { initiala: "A", fundal: "#f5c518", text: "#1d1d1b" },
  prospeo: { initiala: "P", fundal: "#2a6df4", text: "#ffffff" },
  hunter: { initiala: "H", fundal: "#f26a2e", text: "#ffffff" },
  waalaxy: { initiala: "W", fundal: "#e83e8c", text: "#ffffff" },
};

const fmt = new Intl.NumberFormat("ro-RO");

function MarcaFurnizor({ furnizor, activ }: { furnizor: CreditFurnizor["furnizor"]; activ: boolean }) {
  const m = MARCA[furnizor];
  return (
    <span
      aria-hidden
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[13px] font-bold"
      style={{ background: m.fundal, color: m.text, opacity: activ ? 1 : 0.35 }}
    >
      {m.initiala}
    </span>
  );
}

function stare(c: CreditFurnizor): string {
  if (!c.conectat) return "neconectat";
  if (c.eroare) return "cheie de verificat";
  if (c.credite?.ramase != null) return `${fmt.format(c.credite.ramase)} credite`;
  return "conectat";
}

// Instrumentele conectate ale organizației și creditele rămase în conturile lor. Creditele se citesc live, cu apeluri de cont gratuite.
export function CrediteFurnizori({ orgSlug, versiune }: { orgSlug: string; versiune: number }) {
  const [date, setDate] = useState<CreditFurnizor[] | null>(null);

  useEffect(() => {
    let activ = true;
    creditePrelucrare(orgSlug).then((r) => {
      if (activ) setDate(r);
    });
    return () => {
      activ = false;
    };
  }, [orgSlug, versiune]);

  const lista: CreditFurnizor[] = date ?? (Object.keys(MARCA) as CreditFurnizor["furnizor"][]).map((furnizor) => ({ furnizor, conectat: false, credite: null }));

  return (
    <ul className="mb-3 flex flex-wrap gap-2" aria-label="Instrumente conectate și credite">
      {lista.map((c) => (
        <li
          key={c.furnizor}
          title={c.eroare ?? (c.conectat && c.credite?.ramase == null && c.furnizor === "apollo" ? "Apollo nu expune creditele prin API; le vezi în contul Apollo." : undefined)}
          className="flex items-center gap-2 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2.5 py-1.5"
        >
          <MarcaFurnizor furnizor={c.furnizor} activ={c.conectat} />
          <span className="leading-tight">
            <span className={`block text-[12.5px] font-semibold ${c.conectat ? "text-[var(--ci-text)]" : "text-[var(--ci-text-faint)]"}`}>{NUME_CONECTOR[c.furnizor]}</span>
            <span className={`block text-[11.5px] tabular-nums ${c.eroare ? "text-[var(--ci-amber)]" : "text-[var(--ci-text-muted)]"}`}>{date === null ? "…" : stare(c)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
