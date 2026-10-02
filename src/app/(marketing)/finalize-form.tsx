"use client";

import Link from "next/link";
import { useActionState, useState, useSyncExternalStore } from "react";

import { PLAN_QUERY_KEYS, type PlanQueryValues } from "@/lib/billing/plan-query";
import { useAlegerePlan } from "@/lib/billing/use-alegere-plan";
import { COOKIE_ACCEPTARE_TERMENI } from "@/lib/legal-version";

import { finalizeazaOrganizatiaAction } from "./finalize-actions";

export function FinalizeForm({
  email,
  planValues = {},
  referralCode = "",
}: {
  email: string;
  planValues?: PlanQueryValues;
  referralCode?: string;
}) {
  const [state, formAction, pending] = useActionState(finalizeazaOrganizatiaAction, { error: null });
  const alegerePlan = useAlegerePlan(planValues);
  // Pre-bifat dacă acordul a fost deja dat pe pagina de înscriere (cookie
  // scurt purtat peste redirectul Google) — altfel cere bifa aici.
  const cookiePrezent = useSyncExternalStore(
    () => () => {},
    () => document.cookie.split(";").some((c) => c.trim().startsWith(`${COOKIE_ACCEPTARE_TERMENI}=`)),
    () => false,
  );
  const [alegere, setAlegere] = useState<boolean | null>(null);
  const accepta = alegere ?? cookiePrezent;
  const setAccepta = setAlegere;

  return (
    <main className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <h1 className="font-display text-2xl font-bold text-ink">Încă un pas</h1>
      <p className="mt-1 text-sm text-muted">
        Ești autentificat(ă) ca <strong>{email}</strong>. Cum se numește organizația pentru care creezi contul?
      </p>

      {alegerePlan && (
        <div className="mt-4 rounded-lg border border-brand-green bg-brand-green-soft px-3.5 py-2.5 text-sm text-ink">
          Planul ales pe pagina de prețuri: <strong>{alegerePlan.nume}</strong>
          {alegerePlan.pret != null && ` — ${alegerePlan.pret} lei/lună`}. Îl aplicăm automat organizației tale noi.
        </div>
      )}

      {referralCode && (
        <div className="mt-4 rounded-lg border border-brand-green bg-brand-green-soft px-3.5 py-2.5 text-sm text-ink">
          Ai un cod de recomandare — primești <strong>50% reducere</strong> la primul abonament plătit.
        </div>
      )}

      <form action={formAction} className="mt-6 flex flex-col gap-3">
        <input type="hidden" name="ref" value={referralCode} />
        {PLAN_QUERY_KEYS.map((key) => (
          <input key={key} type="hidden" name={key} value={planValues[key] ?? ""} />
        ))}
        <label className="text-sm font-medium text-ink">
          Numele organizației
          <input
            name="orgName"
            required
            autoFocus
            placeholder="ex. Asociația Sprijin"
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>

        <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-body">
          <input
            type="checkbox"
            name="acceptTermeni"
            required
            checked={accepta}
            onChange={(e) => setAccepta(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-line"
          />
          <span>
            Am citit și sunt de acord cu{" "}
            <Link href="/termeni" target="_blank" className="font-medium text-brand-green underline">
              Termenii și condițiile
            </Link>{" "}
            și cu{" "}
            <Link href="/gdpr" target="_blank" className="font-medium text-brand-green underline">
              Politica de confidențialitate
            </Link>
            .
          </span>
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-brand-green px-4 py-2.5 font-medium text-white transition hover:bg-brand-green-hover disabled:opacity-60"
        >
          {pending ? "Se creează..." : "Continuă"}
        </button>
      </form>
    </main>
  );
}
