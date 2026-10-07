"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { extractPlanQuery, PLAN_QUERY_KEYS } from "@/lib/billing/plan-query";
import { useAlegerePlan } from "@/lib/billing/use-alegere-plan";
import type { Locale } from "@/lib/i18n/config";
import { DPA_ACTIV } from "@/lib/legal-version";
import type { AUTH_DICT } from "@/lib/i18n/dictionaries/auth";

import { GoogleButton } from "../google-button";
import { PasswordField } from "../password-field";
import { signupAction } from "./actions";
import { useActionStatePastrat } from "@/lib/use-action-state-pastrat";

type Dict = (typeof AUTH_DICT)[Locale];

function SignupFormInner({ dict }: { dict: Dict }) {
  const [state, formAction, pending, valori] = useActionStatePastrat(signupAction, { error: null });
  const [accepta, setAccepta] = useState(false);
  const params = useSearchParams();
  const inviteToken = params.get("invite") || "";
  const beneficiarInviteToken = params.get("beneficiarInvite") || "";
  const areInvitatie = Boolean(inviteToken || beneficiarInviteToken);
  const planValues = extractPlanQuery((key) => params.get(key));
  const alegerePlan = useAlegerePlan(planValues);
  const referralCode = params.get("ref") || "";

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-ink">
        {areInvitatie ? dict.signup.titluInvitatie : dict.signup.titluOrg}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {inviteToken
          ? dict.signup.descInvitatieOrg
          : beneficiarInviteToken
            ? dict.signup.descInvitatieBeneficiar
            : dict.signup.descNou}
      </p>

      <label className="mt-6 flex items-start gap-2.5 text-[13px] leading-relaxed text-body">
        <input
          type="checkbox"
          name="acceptTermeni"
          form="signup-form"
          required
          checked={accepta}
          onChange={(e) => setAccepta(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-line"
        />
        <span>
          {dict.signup.acceptPre}{" "}
          <Link href="/termeni" target="_blank" rel="noopener" className="font-medium text-brand-green underline">
            {dict.signup.acceptTermeni}
          </Link>{" "}
          {dict.signup.acceptSi}{" "}
          <Link href="/gdpr" target="_blank" rel="noopener" className="font-medium text-brand-green underline">
            {dict.signup.acceptGdpr}
          </Link>
          {DPA_ACTIV && !inviteToken && !beneficiarInviteToken && (
            <>
              {dict.signup.acceptDpaPre}{" "}
              <Link href="/dpa" target="_blank" rel="noopener" className="font-medium text-brand-green underline">
                {dict.signup.acceptDpa}
              </Link>
            </>
          )}
          .
        </span>
      </label>

      <div className="mt-4">
        <GoogleButton dict={dict} acceptat={accepta} />
        {!accepta && <p className="mt-1.5 text-xs text-muted">{dict.signup.acceptGoogleIndiciu}</p>}
      </div>

      <div className="my-4 flex items-center gap-3 text-xs font-medium text-muted-2">
        <span className="h-px flex-1 bg-line" />
        {dict.dividerEmail}
        <span className="h-px flex-1 bg-line" />
      </div>

      {!areInvitatie && alegerePlan && (
        <div className="mb-1 rounded-lg border border-brand-green bg-brand-green-soft px-3.5 py-2.5 text-sm text-ink">
          {dict.signup.planAles} <strong>{alegerePlan.nume}</strong>
          {alegerePlan.pret != null && ` — ${alegerePlan.pret} ${dict.signup.lunaSufix}`}. {dict.signup.planAplicat}
        </div>
      )}

      {!areInvitatie && referralCode && (
        <div className="mb-1 rounded-lg border border-brand-green bg-brand-green-soft px-3.5 py-2.5 text-sm text-ink">
          {dict.signup.referralBanner}
          <strong>{dict.signup.referralReducere}</strong>
          {dict.signup.referralSufix}
        </div>
      )}

      <form id="signup-form" action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="inviteToken" value={inviteToken} />
        <input type="hidden" name="beneficiarInviteToken" value={beneficiarInviteToken} />
        {!areInvitatie && <input type="hidden" name="ref" value={referralCode} />}
        {!areInvitatie &&
          PLAN_QUERY_KEYS.map((key) => <input key={key} type="hidden" name={key} value={planValues[key] ?? ""} />)}
        {!areInvitatie && (
          <label className="text-sm font-medium text-ink">
            {dict.signup.numeOrgLabel}
            <input
              name="orgName"
              defaultValue={valori.orgName}
              required
              className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
              placeholder={dict.signup.numeOrgPlaceholder}
            />
          </label>
        )}
        <label className="text-sm font-medium text-ink">
          {dict.emailLabel}
          <input
            type="email"
            name="email"
            defaultValue={valori.email}
            autoComplete="username"
            required
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <PasswordField
          label={dict.parolaLabel}
          name="password"
          autoComplete="new-password"
          minLength={8}
          hint={dict.parolaIndiciu}
          arata={dict.arataParola}
          ascunde={dict.ascundeParola}
        />

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-brand-green px-4 py-2.5 font-medium text-white transition hover:bg-brand-green-hover disabled:opacity-60"
        >
          {pending ? dict.signup.seCreeaza : dict.signup.submit}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        {dict.signup.aiCont}{" "}
        <Link
          href={
            inviteToken
              ? `/login?invite=${inviteToken}`
              : beneficiarInviteToken
                ? `/login?beneficiarInvite=${beneficiarInviteToken}`
                : "/login"
          }
          className="font-medium text-brand-green"
        >
          {dict.signup.autentificaTe}
        </Link>
      </p>
    </>
  );
}

export function SignupForm({ dict }: { dict: Dict }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Suspense fallback={null}>
        <SignupFormInner dict={dict} />
      </Suspense>
    </main>
  );
}
