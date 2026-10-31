"use client";

import { useState, useTransition } from "react";

import { SURSE_UI_DICT } from "@/lib/i18n/dictionaries/surse-ui";

import { Input } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { salveazaFereastraAtribuire } from "./actions";

// Setarea ferestrei de atribuire (zile). Doar proprietarul/administratorul o vede.
export function FereastraAtribuire({ orgSlug, initiala }: { orgSlug: string; initiala: number }) {
  const d = SURSE_UI_DICT[useLocale()].fereastra;
  const [zile, setZile] = useState(String(initiala));
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function salveaza(e: React.FormEvent) {
    e.preventDefault();
    setMesaj(null);
    start(async () => {
      try {
        const v = await salveazaFereastraAtribuire(orgSlug, Number(zile));
        setZile(String(v));
        setMesaj(d.salvat);
      } catch (err) {
        setMesaj(err instanceof Error ? err.message : d.eroare);
      }
    });
  }

  return (
    <form onSubmit={salveaza} className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="fereastra-atribuire" className="mb-1 block text-[12px] font-medium text-[var(--ci-text-muted)]">
          {d.eticheta}
        </label>
        <Input id="fereastra-atribuire" type="number" min={1} max={90} value={zile} onChange={(e) => setZile(e.target.value)} className="w-28" />
      </div>
      <button type="submit" disabled={pending} className="h-9 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] disabled:opacity-50">
        {pending ? d.seSalveaza : d.salveaza}
      </button>
      {mesaj && (
        <p role="status" className="text-[12.5px] text-[var(--ci-text-muted)]">
          {mesaj}
        </p>
      )}
    </form>
  );
}
