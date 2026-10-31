"use client";

import { Lock } from "lucide-react";
import Link from "next/link";

import { MODULE_PACHET, type ModulPachet } from "@/lib/billing/packages";
import { COMPONENTE_UI_DICT } from "@/lib/i18n/dictionaries/componente-ui";

import { useLocale } from "../lib/locale-context";

const NUME_MINIM = { crestere: "CREȘTERE", impact: "IMPACT" } as const;

// Nota de pe o pagină care există pentru toate pachetele, dar are o secțiune inclusă doar din anumite pachete (vezi MODULE_PACHET).
// Pentru module întregi se folosește PoartaModul; aceasta înlocuiește doar secțiunea, ca restul paginii să rămână util.
export function ModulBlocatInline({ orgSlug, modul, descriere, poateSchimba }: { orgSlug: string; modul: ModulPachet; descriere: string; poateSchimba: boolean }) {
  const t = COMPONENTE_UI_DICT[useLocale()].modulBlocat;
  const { nume: numeRo, minim } = MODULE_PACHET[modul];
  const nume = t.module[modul] ?? numeRo;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[var(--ci-radius-card)] border border-dashed border-[var(--ci-border-strong)] bg-[var(--ci-surface)] px-4 py-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--ci-amber-soft)] text-[var(--ci-text)]">
        <Lock className="h-4 w-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-[var(--ci-text)]">
          {nume} <span className="font-normal text-[var(--ci-text-muted)]">· {t.incepand(NUME_MINIM[minim])}</span>
        </p>
        <p className="text-[12.5px] text-[var(--ci-text-muted)]">{descriere}</p>
      </div>
      {poateSchimba && (
        <Link href={`/${orgSlug}/crm/setari#abonament`} className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-1.5 text-[12.5px] font-semibold text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
          {t.vezi}
        </Link>
      )}
    </div>
  );
}
