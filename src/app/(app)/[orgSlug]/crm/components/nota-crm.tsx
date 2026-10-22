"use client";

import { BookOpen, X } from "lucide-react";
import { useState } from "react";

import { NOTA_CRM_DICT } from "@/lib/i18n/dictionaries/nota-crm";

import { useLocale } from "../lib/locale-context";
import { getNotaCrmAscunsa, setNotaCrmAscunsa, useLocalStoreValue } from "../lib/local-store";

// Explicația „Ce înseamnă CRM?” pentru ONG-urile mici: sensul fiecărui cuvânt din abrevierea CRM + partea tehnică. Apare deschisă până o închide
// utilizatorul cu „Am înțeles”; după aceea rămâne doar un buton mic „Ce înseamnă CRM?”, care o redeschide. Alegerea e păstrată în browser,
// separat pe secțiune (`id`: acasa, companii, persoane-fizice, voluntari), ca fiecare modul să o arate o dată.
export function NotaCrm({ id }: { id: string }) {
  const t = NOTA_CRM_DICT[useLocale()];
  // La randarea de pe server și la primul paint valoarea e „ascunsă” (fără clipire pentru cine a închis-o deja); după hidratare se citește alegerea reală.
  const ascunsa = useLocalStoreValue(() => getNotaCrmAscunsa(id), true);
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

  const inchide = () => {
    setNotaCrmAscunsa(id, true);
    setDeschisaManual(false);
  };
  const titluSectiune = "text-[11px] font-semibold tracking-wide text-[var(--ci-text-muted)] uppercase";
  const card = "rounded-lg bg-[var(--ci-surface)] px-3.5 py-2.5";

  return (
    <aside aria-label={t.titlu} className="relative rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-primary-soft)] p-4 pr-11">
      <button
        type="button"
        onClick={inchide}
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
      <p className="mt-1.5 max-w-4xl text-[13px] leading-relaxed text-[var(--ci-text)]">{t.intro}</p>

      <div className="mt-3 grid gap-4 lg:grid-cols-2">
        <div>
          <p className={titluSectiune}>{t.cuvinteTitlu}</p>
          <ul className="mt-1.5 space-y-2">
            {t.cuvinte.map((c) => (
              <li key={c.termen} className={card}>
                <p className="text-[13px] font-semibold text-[var(--ci-text)]">
                  {c.termen} <span className="font-normal text-[var(--ci-text-muted)]">· {c.sens}</span>
                </p>
                <p className="mt-0.5 text-[12.5px] leading-snug text-[var(--ci-text-muted)]">{c.d}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className={titluSectiune}>{t.tehnicTitlu}</p>
          <div className={`${card} mt-1.5`}>
            <p className="text-[12.5px] leading-snug text-[var(--ci-text)]">{t.tehnicIntro}</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12.5px] leading-snug text-[var(--ci-text-muted)]">
              {t.tehnic.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <p className="mt-3 max-w-4xl text-[12.5px] leading-relaxed text-[var(--ci-text-muted)]">
        <span className="font-semibold text-[var(--ci-text)]">{t.exempluTitlu}: </span>
        {t.exemplu}
      </p>
      <button type="button" onClick={inchide} className="mt-3 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-3.5 py-1.5 text-[12.5px] font-semibold text-white hover:opacity-90">
        {t.ascunde}
      </button>
    </aside>
  );
}
