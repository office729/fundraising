"use client";

import Link from "next/link";
import { useActionState } from "react";

import { forgotPasswordAction } from "./actions";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(forgotPasswordAction, {
    error: null,
    trimis: false,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="font-display text-2xl font-bold text-ink">Ai uitat parola?</h1>
      <p className="mt-2 text-sm text-muted">
        Introdu adresa de email a contului — dacă există, primești un link de resetare.
      </p>

      {state.trimis ? (
        <p className="mt-6 rounded-lg bg-brand-green-soft px-3 py-2.5 text-sm text-ink">
          Dacă adresa are un cont, ți-am trimis un email cu un link de resetare a parolei.
        </p>
      ) : (
        <form action={formAction} className="mt-6 flex flex-col gap-3">
          <label className="text-sm font-medium text-ink">
            Email
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
            />
          </label>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-brand-green px-4 py-2.5 font-medium text-white transition hover:bg-brand-green-hover disabled:opacity-60"
          >
            {pending ? "Se trimite..." : "Trimite link de resetare"}
          </button>
        </form>
      )}

      <p className="mt-4 text-sm text-muted">
        <Link href="/login" className="font-medium text-brand-green">
          Înapoi la autentificare
        </Link>
      </p>
    </main>
  );
}
