"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import { NUME_CONECTOR } from "@/lib/prospectare/motor";

import { creditePrelucrare, type CreditFurnizor } from "./prospectare-actions";

// Siglele instrumentelor (pictogramele oficiale de pe site-urile lor, în public/furnizori), folosite doar ca să se recunoască instrumentul conectat.
const SIGLA: Record<CreditFurnizor["furnizor"], string> = {
  lusha: "/furnizori/lusha.png",
  apollo: "/furnizori/apollo.svg",
  prospeo: "/furnizori/prospeo.png",
  hunter: "/furnizori/hunter.png",
  waalaxy: "/furnizori/waalaxy.png",
};

const fmt = new Intl.NumberFormat("ro-RO");

function MarcaFurnizor({ furnizor, activ }: { furnizor: CreditFurnizor["furnizor"]; activ: boolean }) {
  return (
    <Image
      src={SIGLA[furnizor]}
      alt=""
      aria-hidden
      width={28}
      height={28}
      unoptimized
      className="h-7 w-7 shrink-0 rounded-md border border-[var(--ci-border)] bg-white object-contain"
      style={{ opacity: activ ? 1 : 0.4, filter: activ ? undefined : "grayscale(1)" }}
    />
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

  const lista: CreditFurnizor[] = date ?? (Object.keys(SIGLA) as CreditFurnizor["furnizor"][]).map((furnizor) => ({ furnizor, conectat: false, credite: null }));

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
