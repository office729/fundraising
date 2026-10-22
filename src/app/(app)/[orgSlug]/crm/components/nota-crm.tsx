"use client";

import { BookOpen, X } from "lucide-react";
import { useState } from "react";

import { NOTA_CRM_DICT } from "@/lib/i18n/dictionaries/nota-crm";

import { useLocale } from "../lib/locale-context";
import { getNotaCrmAscunsa, setNotaCrmAscunsa, useLocalStoreValue } from "../lib/local-store";

// Explicația „Ce înseamnă CRM?” pentru ONG-urile mici. Apare deschisă până o închide utilizatorul cu „Am înțeles”; după aceea rămâne doar un
// buton mic „Ce înseamnă CRM?”, care o redeschide. Alegerea e păstrată în browser (aceeași pentru toate paginile CRM).
export function NotaCrm() {
  const t = NOTA_CRM_DICT[useLocale()];
  // La randarea de pe server și la primul paint valoarea e „ascunsă” (fără clipire pentru cine a închis-o deja); după hidratare se citește alegerea reală.
  const ascunsa = useLocalStoreValue(getNotaCrmAscunsa, true);
  const [deschisaManual, setDeschisaManual] = useState(false);

  if (ascunsa && !deschisaManual) {
    return (
      <button
        type="button"
        onClick={() => setDeschisaManual(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ci-border)] px-3 py-1 text-[12px] font-medium text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
      >
        <BookOpen className="h-3.5 w-3.5" aria-hidden />
        {t.arata}
      </button>
    );
  }

  return (
    <aside
      aria-label={t.titlu}
      className="relative rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-primary-soft)] p-4 pr-10"
    >
      <button
        type="button"
        onClick={() => {
          setNotaCrmAscunsa(true);
          setDeschisaManual(false);
        }}
        aria-label={t.ascunde}
        title={t.ascunde}
        className="absolute top-2.5 right-2.5 flex h-7 w-7 items-center justify-center rounded-full text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface)] hover:text-[var(--ci-text)]"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="flex items-center gap-2 text-[14px] font-semibold text-[var(--ci-text)]">
        <BookOpen className="h-4 w-4 text-[var(--ci-primary)]" aria-hidden />
        {t.titlu}
      </p>
      <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-[var(--ci-text)]">{t.intro}</p>
      <ul className="mt-2.5 grid gap-2 sm:grid-cols-3">
        {t.puncte.map((p) => (
          <li key={p.t} className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface)] px-3 py-2 text-[12.5px] leading-snug text-[var(--ci-text-muted)]">
            <span className="block font-semibold text-[var(--ci-text)]">{p.t}</span>
            {p.d}
          </li>
        ))}
      </ul>
      <p className="mt-2.5 max-w-3xl text-[12.5px] leading-relaxed text-[var(--ci-text-muted)]">
        <span className="font-semibold text-[var(--ci-text)]">{t.exempluTitlu}: </span>
        {t.exemplu}
      </p>
      <button
        type="button"
        onClick={() => {
          setNotaCrmAscunsa(true);
          setDeschisaManual(false);
        }}
        className="mt-3 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90"
      >
        {t.ascunde}
      </button>
    </aside>
  );
}
