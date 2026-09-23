"use client";

import { useEffect, useState } from "react";

import type { Locale } from "@/lib/i18n/config";
import { DONATION_DICT } from "@/lib/i18n/dictionaries/donation";

import { DoneazaForm } from "./doneaza-form";

// Butonul „Donează" deschide formularul într-un modal, în loc să stea
// îngropat mai jos pe pagină — mutat lângă titlu/poveste, ca prim CTA vizibil.
export function DoneazaModal({
  orgSlug,
  pageSlug,
  titlu,
  locale,
}: {
  orgSlug: string;
  pageSlug: string;
  titlu: string;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const t = DONATION_DICT[locale].donateModal;

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-lg bg-brand-green px-5 py-2.5 text-center text-[13.5px] font-bold text-white shadow-sm transition hover:bg-brand-green-hover hover:shadow-md"
      >
        {t.donezaAcum}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-8" onClick={() => setOpen(false)}>
          <div
            className="w-full max-w-md rounded-2xl border border-line bg-panel p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-bold text-ink">{t.donezaPentru(titlu)}</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.inchide}
                className="flex h-7 w-7 items-center justify-center rounded-full text-muted-2 hover:bg-panel-2"
              >
                ✕
              </button>
            </div>
            <DoneazaForm orgSlug={orgSlug} pageSlug={pageSlug} titlu={titlu} locale={locale} />
          </div>
        </div>
      )}
    </>
  );
}
