"use client";

import type { DomeniuActivitate } from "@/lib/campaign-templates";
import type { Locale } from "@/lib/i18n/config";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";
import { BrandingForm } from "./setari/branding-form";
import { usePersistentDismiss } from "./use-persistent-dismiss";

// Panou de prim contact — apare după autentificare cât timp organizația nu
// are logo încărcat, ca identitatea ei (nume, logo, culoare) să înlocuiască
// branding-ul demonstrativ „Fundraising Academy" din antet și din CRM.
//
// Dismiss-ul e persistat în localStorage (per browser, NU în DB — un owner
// care se loghează de pe alt device tot îl vede, intenționat) — altfel
// reapărea la FIECARE încărcare de pagină (orice navigare hard, refresh, link
// nou), nu doar o dată per sesiune de tab, ceea ce era resimțit ca deranjant
// (vezi feedback-ul „îmi apare prea des"). Vezi use-persistent-dismiss.ts.
export function OnboardingBrandingGate({
  show,
  orgSlug,
  orgName,
  locale,
  initialSlogan,
  initialBrandColor,
  initialCif,
  initialDomeniuActivitate,
}: {
  show: boolean;
  orgSlug: string;
  orgName: string;
  locale: Locale;
  initialSlogan: string | null;
  initialBrandColor: string | null;
  initialCif: string | null;
  initialDomeniuActivitate: DomeniuActivitate | null;
}) {
  const dict = SETARI_ECHIPA_DICT[locale].onboardingGate;
  const { dismissed, dismiss } = usePersistentDismiss(`fa-onboarding-branding-dismissed-${orgSlug}`);

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
          initialCif={initialCif}
          initialDomeniuActivitate={initialDomeniuActivitate}
          onSaved={dismiss}
        />
        <button
          type="button"
          onClick={dismiss}
          className="mt-3 text-sm text-muted transition hover:text-ink"
        >
          {dict.maiTarziu}
        </button>
      </div>
    </div>
  );
}
