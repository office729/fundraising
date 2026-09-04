"use client";

import { useState } from "react";

import type { Locale } from "@/lib/i18n/config";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";
import { BrandingForm } from "./setari/branding-form";

// Panou de prim contact — apare după autentificare cât timp organizația nu
// are logo încărcat, ca identitatea ei (nume, logo, culoare) să înlocuiască
// branding-ul demonstrativ „Fundraising Academy" din antet și din CRM.
export function OnboardingBrandingGate({
  show,
  orgSlug,
  orgName,
  locale,
  initialSlogan,
  initialBrandColor,
}: {
  show: boolean;
  orgSlug: string;
  orgName: string;
  locale: Locale;
  initialSlogan: string | null;
  initialBrandColor: string | null;
}) {
  const dict = SETARI_ECHIPA_DICT[locale].onboardingGate;
  const [dismissed, setDismissed] = useState(false);

  if (!show || dismissed) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[1px]">
      <div className="w-full max-w-lg rounded-2xl border border-line bg-panel p-6 shadow-2xl">
        <h2 className="font-display text-xl font-bold text-ink">{dict.title(orgName)}</h2>
        <p className="mt-1.5 text-sm text-muted">{dict.description}</p>
        <BrandingForm
          orgSlug={orgSlug}
          locale={locale}
          initialLogoUrl={null}
          initialSlogan={initialSlogan}
          initialBrandColor={initialBrandColor}
          onSaved={() => setDismissed(true)}
        />
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="mt-3 text-sm text-muted transition hover:text-ink"
        >
          {dict.maiTarziu}
        </button>
      </div>
    </div>
  );
}
