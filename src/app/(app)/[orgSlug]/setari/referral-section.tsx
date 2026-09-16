"use client";

import { useState } from "react";

import type { Locale } from "@/lib/i18n/config";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";

export function ReferralSection({ cod, numarRecomandari, locale }: { cod: string; numarRecomandari: number; locale: Locale }) {
  const dict = SETARI_ECHIPA_DICT[locale].orgSetari.referral;
  const [copiat, setCopiat] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/signup?ref=${cod}` : `/signup?ref=${cod}`;

  async function copiaza() {
    await navigator.clipboard.writeText(link);
    setCopiat(true);
    setTimeout(() => setCopiat(false), 2000);
  }

  return (
    <section className="mt-8 border-t border-line pt-6">
      <h2 className="font-display text-lg font-bold text-ink">{dict.title}</h2>
      <p className="mt-1 text-sm text-muted">{dict.descriere}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm text-body"
        />
        <button
          type="button"
          onClick={copiaza}
          className="shrink-0 rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-green-hover"
        >
          {copiat ? dict.copiat : dict.copiaza}
        </button>
      </div>
      <p className="mt-2 text-sm text-muted">{dict.numarRecomandari(numarRecomandari)}</p>
    </section>
  );
}
