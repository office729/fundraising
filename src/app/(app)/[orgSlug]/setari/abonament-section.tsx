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
export type FacturaRand = {
  id: string;
  createdAt: Date;
  sumaLei: number;
  facturaLink: string | null;
  facturaNumar: string | null;
};

export function AbonamentSection({
  orgSlug,
  pachetCurent,
  statusCurent,
  locale,
  facturi,
}: {
  orgSlug: string;
  pachetCurent: OrgPackage;
  statusCurent: string;
  locale: Locale;
  facturi: FacturaRand[];
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

      {facturi.length > 0 && (
        <div className="mt-6">
          <h3 className="font-display text-sm font-bold text-ink">{dict.facturi.title}</h3>
          <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
            {facturi.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                <span className="text-muted">
                  {f.createdAt.toLocaleDateString(locale === "en" ? "en-GB" : "ro-RO", { day: "2-digit", month: "short", year: "numeric" })} · {f.sumaLei.toLocaleString("ro-RO")} lei
                </span>
                {f.facturaLink ? (
                  <a href={f.facturaLink} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-blue hover:underline">
                    {dict.facturi.descarca} {f.facturaNumar ? `#${f.facturaNumar}` : ""}
                  </a>
                ) : (
                  <span className="text-muted-2">{dict.facturi.inAsteptare}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
