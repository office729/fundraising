"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";

import { GoogleButton } from "../google-button";
import { loginAction } from "./actions";

function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, { error: null });
  const params = useSearchParams();
  const inviteToken = params.get("invite") || "";
  const confirmareNecesara = params.get("confirmare") === "necesara";

  return (
    <>
      <h1 className="font-display text-2xl font-bold text-ink">Autentificare</h1>

      {confirmareNecesara && (
        <p className="mt-3 rounded-lg bg-brand-amber-soft px-3 py-2 text-sm text-ink">
          Contul a fost creat — confirmă adresa de email primită, apoi autentifică-te.
        </p>
      )}

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
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>

        <Link href="/forgot-password" className="-mt-1 self-start text-sm font-medium text-brand-green">
          Ai uitat parola?
        </Link>

        <label className="flex items-center gap-2 text-sm text-body">
          <input type="checkbox" name="ramaiConectat" defaultChecked className="h-4 w-4 rounded border-line" />
          Rămâi conectat pe acest dispozitiv
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-brand-green px-4 py-2.5 font-medium text-white transition hover:bg-brand-green-hover disabled:opacity-60"
        >
          {pending ? "Se autentifică..." : "Autentificare"}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        Nu ai cont?{" "}
        <Link
          href={inviteToken ? `/signup?invite=${inviteToken}` : "/signup"}
          className="font-medium text-brand-green"
        >
          Creează unul
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
