"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { PLAN_QUERY_KEYS, type PlanQueryValues } from "@/lib/billing/plan-query";
import { useAlegerePlan } from "@/lib/billing/use-alegere-plan";
import { COOKIE_ACCEPTARE_TERMENI, DPA_ACTIV } from "@/lib/legal-version";

import { finalizeazaOrganizatiaAction } from "./finalize-actions";
import { useActionStatePastrat } from "@/lib/use-action-state-pastrat";

export function FinalizeForm({
  email,
  planValues = {},
  referralCode = "",
  orgNameInitial = "",
  numeInitial = "",
  telefonInitial = "",
  cifInitial = "",
}: {
  email: string;
  planValues?: PlanQueryValues;
  referralCode?: string;
  orgNameInitial?: string;
  numeInitial?: string;
  telefonInitial?: string;
  cifInitial?: string;
}) {
  const [state, formAction, pending, valori] = useActionStatePastrat(finalizeazaOrganizatiaAction, { error: null });
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
        Ești autentificat(ă) ca <strong>{email}</strong>. Completează datele organizației pentru care creezi contul.
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
          Numele tău
          <input
            name="numeContact"
            defaultValue={valori.numeContact ?? numeInitial}
            autoComplete="name"
            maxLength={120}
            required
            autoFocus
            placeholder="ex. Maria Popescu"
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Numele organizației
          <input
            name="orgName"
            defaultValue={valori.orgName ?? orgNameInitial}
            maxLength={120}
            required
            placeholder="ex. Asociația Sprijin"
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Număr de telefon
          <input
            type="tel"
            name="telefon"
            defaultValue={valori.telefon ?? telefonInitial}
            autoComplete="tel"
            inputMode="tel"
            required
            placeholder="ex. 0722 123 456"
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <div className="text-sm font-medium text-ink">
          <label htmlFor="cif-org-fin">CIF-ul organizației</label>
          <input
            id="cif-org-fin"
            name="cif"
            defaultValue={valori.cif ?? cifInitial}
            autoCapitalize="characters"
            autoComplete="off"
            required
            aria-describedby="cif-indiciu-fin"
            placeholder="ex. RO12345678"
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
          <p id="cif-indiciu-fin" className="mt-1 text-xs font-normal text-muted">
            Îl găsești pe certificatul de înregistrare al organizației (doar cifre, cu sau fără RO).
          </p>
        </div>

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
            {DPA_ACTIV && (
              <>
                , precum și cu{" "}
                <Link href="/dpa" target="_blank" className="font-medium text-brand-green underline">
                  Acordul de prelucrare a datelor (DPA)
                </Link>
              </>
            )}
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
