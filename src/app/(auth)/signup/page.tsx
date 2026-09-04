"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";

import { GoogleButton } from "../google-button";
import { signupAction } from "./actions";

function SignupForm() {
  const [state, formAction, pending] = useActionState(signupAction, { error: null });
  const params = useSearchParams();
  const inviteToken = params.get("invite") || "";

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-ink">
        {inviteToken ? "Creează cont" : "Creează cont pentru ONG-ul tău"}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {inviteToken
          ? "Ai fost invitat(ă) într-o organizație existentă."
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

      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="inviteToken" value={inviteToken} />
        {!inviteToken && (
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
          href={inviteToken ? `/login?invite=${inviteToken}` : "/login"}
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
