"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { contextSerializat } from "@/lib/atribuire/client";
import { PLAN_QUERY_KEYS, type PlanQueryValues } from "@/lib/billing/plan-query";
import { useAlegerePlan } from "@/lib/billing/use-alegere-plan";
import type { Locale } from "@/lib/i18n/config";
import { AUTH_DICT } from "@/lib/i18n/dictionaries/auth";
import { FINALIZE_UI_DICT } from "@/lib/i18n/dictionaries/finalize-ui";
import { COOKIE_ACCEPTARE_TERMENI, DPA_ACTIV } from "@/lib/legal-version";

import { finalizeazaOrganizatiaAction } from "./finalize-actions";
import { useActionStatePastrat } from "@/lib/use-action-state-pastrat";

export function FinalizeForm({
  locale,
  email,
  planValues = {},
  referralCode = "",
  orgNameInitial = "",
  numeInitial = "",
  telefonInitial = "",
  cifInitial = "",
}: {
  locale: Locale;
  email: string;
  planValues?: PlanQueryValues;
  referralCode?: string;
  orgNameInitial?: string;
  numeInitial?: string;
  telefonInitial?: string;
  cifInitial?: string;
}) {
  const a = AUTH_DICT[locale];
  const t = FINALIZE_UI_DICT[locale];
  const [state, formAction, pending, valori] = useActionStatePastrat(finalizeazaOrganizatiaAction, { error: null });
  const ctxAtribuire = useSyncExternalStore(
    () => () => {},
    contextSerializat,
    () => "",
  );
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
      <h1 className="font-display text-2xl font-bold text-ink">{t.titlu}</h1>
      <p className="mt-1 text-sm text-muted">
        {t.autentificatCa}<strong>{email}</strong>{t.completeaza}
      </p>

      {alegerePlan && (
        <div className="mt-4 rounded-lg border border-brand-green bg-brand-green-soft px-3.5 py-2.5 text-sm text-ink">
          {t.planAlesPre}<strong>{alegerePlan.nume}</strong>
          {alegerePlan.pret != null && t.planPret(alegerePlan.pret)}{t.planAplicat}
        </div>
      )}

      {referralCode && (
        <div className="mt-4 rounded-lg border border-brand-green bg-brand-green-soft px-3.5 py-2.5 text-sm text-ink">
          {a.signup.referralBanner}<strong>{a.signup.referralReducere}</strong>{a.signup.referralSufix}
        </div>
      )}

      <form action={formAction} className="mt-6 flex flex-col gap-3">
        <input type="hidden" name="ref" value={referralCode} />
        <input type="hidden" name="ctxAtribuire" value={ctxAtribuire} />
        {PLAN_QUERY_KEYS.map((key) => (
          <input key={key} type="hidden" name={key} value={planValues[key] ?? ""} />
        ))}
        <label className="text-sm font-medium text-ink">
          {a.signup.numeTauLabel}
          <input
            name="numeContact"
            defaultValue={valori.numeContact ?? numeInitial}
            autoComplete="name"
            maxLength={120}
            required
            autoFocus
            placeholder={a.signup.numeTauPlaceholder}
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          {a.signup.numeOrgLabel}
          <input
            name="orgName"
            defaultValue={valori.orgName ?? orgNameInitial}
            maxLength={120}
            required
            placeholder={a.signup.numeOrgPlaceholder}
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          {a.signup.telefonLabel}
          <input
            type="tel"
            name="telefon"
            defaultValue={valori.telefon ?? telefonInitial}
            autoComplete="tel"
            inputMode="tel"
            required
            placeholder={a.signup.telefonPlaceholder}
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <div className="text-sm font-medium text-ink">
          <label htmlFor="cif-org-fin">{a.signup.cifLabel}</label>
          <input
            id="cif-org-fin"
            name="cif"
            defaultValue={valori.cif ?? cifInitial}
            autoCapitalize="characters"
            autoComplete="off"
            required
            aria-describedby="cif-indiciu-fin"
            placeholder={a.signup.cifPlaceholder}
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
          <p id="cif-indiciu-fin" className="mt-1 text-xs font-normal text-muted">
            {a.signup.cifIndiciu}
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
            {a.signup.acceptPre}{" "}
            <Link href="/termeni" target="_blank" className="font-medium text-brand-green underline">
              {a.signup.acceptTermeni}
            </Link>{" "}
            {a.signup.acceptSi}{" "}
            <Link href="/gdpr" target="_blank" className="font-medium text-brand-green underline">
              {a.signup.acceptGdpr}
            </Link>
            {DPA_ACTIV && (
              <>
                {a.signup.acceptDpaPre}{" "}
                <Link href="/dpa" target="_blank" className="font-medium text-brand-green underline">
                  {a.signup.acceptDpa}
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
          {pending ? t.seCreeaza : t.continua}
        </button>
      </form>
    </main>
  );
}
