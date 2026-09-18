"use client";

import { useState } from "react";

import { CalendlyInlineWidget } from "@/components/calendly-inline-widget";
import { CALENDLY_CONSULTANTA_URL } from "@/lib/calendly";
import type { DashboardDict } from "@/lib/i18n/dictionaries/dashboard";
import { usePersistentDismiss } from "./use-persistent-dismiss";

// Bandă discretă (nu blochează, spre deosebire de OnboardingBrandingGate) —
// aceeași condiție de vizibilitate ca gate-ul de branding (org nouă, fără
// logo, owner/admin), afișată SUB acel modal dacă e activ. Dismiss-ul e
// persistat în localStorage (per browser, nu în DB) — la fel ca gate-ul de
// branding, ca să nu reapară la fiecare încărcare de pagină.
export function OnboardingCallPrompt({
  show,
  orgSlug,
  dict,
}: {
  show: boolean;
  orgSlug: string;
  dict: DashboardDict["onboardingCall"];
}) {
  const { dismissed, dismiss } = usePersistentDismiss(`fa-onboarding-call-dismissed-${orgSlug}`);
  const [open, setOpen] = useState(false);

  if (!show || dismissed) return null;

  return (
    <>
      <div className="mb-6 flex flex-col items-start gap-3 rounded-xl border border-brand-green/30 bg-brand-green-soft px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green text-base text-white">
            📅
          </span>
          <div>
            <p className="text-sm font-bold text-ink">{dict.title}</p>
            <p className="text-[13px] text-muted">{dict.desc}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-md bg-brand-green px-4 py-2 text-sm font-bold whitespace-nowrap text-white transition hover:bg-brand-green-hover"
          >
            {dict.cta}
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="text-sm font-medium whitespace-nowrap text-muted transition hover:text-ink"
          >
            {dict.dismiss}
          </button>
        </div>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-ink/50 p-4 backdrop-blur-[1px]"
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-medium text-white transition hover:bg-white/20"
              >
                {dict.close} ✕
              </button>
            </div>
            <CalendlyInlineWidget url={CALENDLY_CONSULTANTA_URL} loadingLabel={dict.loading} />
          </div>
        </div>
      )}
    </>
  );
}
