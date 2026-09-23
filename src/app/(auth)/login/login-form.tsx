"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";

import type { AUTH_DICT } from "@/lib/i18n/dictionaries/auth";
import type { Locale } from "@/lib/i18n/config";

import { GoogleButton } from "../google-button";
import { loginAction } from "./actions";

type Dict = (typeof AUTH_DICT)[Locale];

function LoginFormInner({ dict }: { dict: Dict }) {
  const [state, formAction, pending] = useActionState(loginAction, { error: null });
  const params = useSearchParams();
  const inviteToken = params.get("invite") || "";
  const beneficiarInviteToken = params.get("beneficiarInvite") || "";
  const confirmareNecesara = params.get("confirmare") === "necesara";
  // Setat de /auth/callback (route.ts) când exchangeCodeForSession eșuează —
  // ex. link de resetare a parolei expirat, deja folosit, sau falsificat.
  // Fără acest mesaj, userul ajungea aici fără nicio explicație — părea că
  // "nu s-a întâmplat nimic", nu că link-ul era stricat.
  const linkInvalid = params.get("eroare") === "link_invalid";

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-ink">{dict.login.titlu}</h1>

      {confirmareNecesara && (
        <p className="mt-3 rounded-lg bg-brand-amber-soft px-3 py-2 text-sm text-ink">{dict.login.confirmareNecesara}</p>
      )}

      {linkInvalid && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {dict.login.linkInvalid}{" "}
          <Link href="/forgot-password" className="font-medium underline">
            {dict.login.cereUnulNou}
          </Link>
          .
        </p>
      )}

      <div className="mt-6">
        <GoogleButton dict={dict} />
      </div>

      <div className="my-4 flex items-center gap-3 text-xs font-medium text-muted-2">
        <span className="h-px flex-1 bg-line" />
        {dict.dividerEmail}
        <span className="h-px flex-1 bg-line" />
      </div>

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="inviteToken" value={inviteToken} />
        <input type="hidden" name="beneficiarInviteToken" value={beneficiarInviteToken} />
        <label className="text-sm font-medium text-ink">
          {dict.emailLabel}
          <input
            type="email"
            name="email"
            autoComplete="username"
            required
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          {dict.parolaLabel}
          <input
            type="password"
            name="password"
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>

        <Link href="/forgot-password" className="-mt-1 self-start text-sm font-medium text-brand-green">
          {dict.login.uitatParola}
        </Link>

        <label className="flex items-center gap-2 text-sm text-body">
          <input type="checkbox" name="ramaiConectat" defaultChecked className="h-4 w-4 rounded border-line" />
          {dict.login.ramaiConectat}
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-brand-green px-4 py-2.5 font-medium text-white transition hover:bg-brand-green-hover disabled:opacity-60"
        >
          {pending ? dict.login.seAutentifica : dict.login.submit}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        {dict.login.nuAiCont}{" "}
        <Link
          href={
            inviteToken
              ? `/signup?invite=${inviteToken}`
              : beneficiarInviteToken
                ? `/signup?beneficiarInvite=${beneficiarInviteToken}`
                : "/signup"
          }
          className="font-medium text-brand-green"
        >
          {dict.login.creeazaUnul}
        </Link>
      </p>
    </>
  );
}

export function LoginForm({ dict }: { dict: Dict }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Suspense fallback={null}>
        <LoginFormInner dict={dict} />
      </Suspense>
    </main>
  );
}
