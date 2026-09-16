"use client";

import { useState } from "react";

import { PackagePicker } from "../package-picker";
import type { OrgPackage } from "@/lib/billing/packages";
import type { Locale } from "@/lib/i18n/config";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";

const NUME_PACHET: Record<OrgPackage, string> = {
  trial: "Probă",
  start: "START",
  crestere: "CREȘTERE",
  impact: "IMPACT",
  custom: "Personalizat",
};

// Disponibilă oricând (nu doar când organizația e blocată de paywall.tsx) —
// un ONG proaspăt înscris cu un cod de recomandare trebuie să-și poată
// revendica reducerea de 50% imediat, nu abia peste 14 zile de probă.
export function AbonamentSection({
  orgSlug,
  pachetCurent,
  statusCurent,
  locale,
}: {
  orgSlug: string;
  pachetCurent: OrgPackage;
  statusCurent: string;
  locale: Locale;
}) {
  const dict = SETARI_ECHIPA_DICT[locale].orgSetari.abonament;
  const [arataOptiuni, setArataOptiuni] = useState(pachetCurent === "trial");
  const statusLabel = (dict.status as Record<string, string>)[statusCurent] ?? statusCurent;

  return (
    <section className="mt-8 border-t border-line pt-6">
      <h2 className="font-display text-lg font-bold text-ink">{dict.title}</h2>
      <p className="mt-1 text-sm text-muted">
        {dict.pachetCurent(NUME_PACHET[pachetCurent])} · {statusLabel}
      </p>

      {!arataOptiuni && (
        <button
          type="button"
          onClick={() => setArataOptiuni(true)}
          className="mt-3 rounded-lg border border-brand-blue px-3.5 py-2 text-sm font-medium text-brand-blue transition hover:bg-brand-blue-soft"
        >
          {dict.schimbaPlanul}
        </button>
      )}

      {arataOptiuni && (
        <div className="mt-4">
          {pachetCurent !== "trial" && (
            <button type="button" onClick={() => setArataOptiuni(false)} className="mb-3 text-sm font-medium text-muted hover:text-brand-blue">
              {dict.ascundeOptiunile}
            </button>
          )}
          <PackagePicker orgSlug={orgSlug} />
        </div>
      )}
    </section>
  );
}
