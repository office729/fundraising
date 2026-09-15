"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useMemo } from "react";

import { calculateCustomPlanPrice, normalizeCustomPlanConfig } from "@/lib/billing/custom-plan";
import { PACKAGE_LIMITS, type OrgPackage } from "@/lib/billing/packages";

import { GoogleButton } from "../google-button";
import { signupAction } from "./actions";

const PLAN_NUME: Record<Exclude<OrgPackage, "trial" | "custom">, string> = {
  start: "START",
  crestere: "CREȘTERE",
  impact: "IMPACT",
};

// Rezumatul planului ales pe /hub (fix sau à la carte), transportat aici prin
// query params — vezi hub/page.tsx și hub/custom-plan-calculator.tsx. Doar
// pentru afișare; signupAction reface aceeași normalizare + calcul de preț
// server-side (nu are încredere în ce vine din URL).
function useAlegerePlan(params: URLSearchParams) {
  const plan = params.get("plan");
  return useMemo(() => {
    if (plan === "start" || plan === "crestere" || plan === "impact") {
      return { nume: PLAN_NUME[plan], pret: PACKAGE_LIMITS[plan].pretLunar };
    }
    if (plan === "custom") {
      const config = normalizeCustomPlanConfig({
        utilizatori: Number(params.get("utilizatori")),
        contactePf: Number(params.get("contactePf")),
        companiiPj: Number(params.get("companiiPj")),
        generariLunare: Number(params.get("generariLunare")),
        tools: (params.get("tools") ?? "").split(",").filter(Boolean),
        accesDesignToate: params.get("accesDesignToate") === "1",
      });
      return { nume: "Plan personalizat", pret: calculateCustomPlanPrice(config) };
    }
    return null;
  }, [plan, params]);
}

function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, { error: null });
  const params = useSearchParams();
  const inviteToken = params.get("invite") || "";
  const beneficiarInviteToken = params.get("beneficiarInvite") || "";
  const areInvitatie = Boolean(inviteToken || beneficiarInviteToken);
  const alegerePlan = useAlegerePlan(params);

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-ink">
        {areInvitatie ? "Creează cont" : "Creează cont pentru ONG-ul tău"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {inviteToken
          ? "Ai fost invitat(ă) într-o organizație existentă."
          : beneficiarInviteToken
            ? "Ai fost invitat(ă) în panoul dedicat campaniei tale."
            : "Un cont nou = o organizație nouă, izolată complet de restul clienților."}
      </p>

      <div className="mt-6">
        <GoogleButton />
      </div>

      <div className="my-4 flex items-center gap-3 text-xs font-medium text-muted-2">
        <span className="h-px flex-1 bg-line" />
        sau cu email
        <span className="h-px flex-1 bg-line" />
      </div>

      {!areInvitatie && alegerePlan && (
        <div className="mb-1 rounded-lg border border-brand-green bg-brand-green-soft px-3.5 py-2.5 text-sm text-ink">
          Planul ales pe pagina de prețuri: <strong>{alegerePlan.nume}</strong>
          {alegerePlan.pret != null && ` — ${alegerePlan.pret} lei/lună`}. Îl aplicăm automat organizației tale noi.
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="inviteToken" value={inviteToken} />
        <input type="hidden" name="beneficiarInviteToken" value={beneficiarInviteToken} />
        {!areInvitatie && (
          <>
            <input type="hidden" name="plan" value={params.get("plan") ?? ""} />
            <input type="hidden" name="utilizatori" value={params.get("utilizatori") ?? ""} />
            <input type="hidden" name="contactePf" value={params.get("contactePf") ?? ""} />
            <input type="hidden" name="companiiPj" value={params.get("companiiPj") ?? ""} />
            <input type="hidden" name="generariLunare" value={params.get("generariLunare") ?? ""} />
            <input type="hidden" name="tools" value={params.get("tools") ?? ""} />
            <input type="hidden" name="accesDesignToate" value={params.get("accesDesignToate") ?? ""} />
          </>
        )}
        {!areInvitatie && (
          <label className="text-sm font-medium text-ink">
            Numele organizației
            <input
              name="orgName"
              required
              className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
              placeholder="ex. Asociația Sprijin"
            />
          </label>
        )}
        <label className="text-sm font-medium text-ink">
          Email
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Parolă
          <input
            type="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-brand-green px-4 py-2.5 font-medium text-white transition hover:bg-brand-green-hover disabled:opacity-60"
        >
          {pending ? "Se creează contul..." : "Creează cont"}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        Ai deja cont?{" "}
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
          Autentifică-te
        </Link>
      </p>
    </>
  );
}

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </main>
  );
}
