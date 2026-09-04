"use client";

import { useActionState } from "react";

import { resetPasswordAction } from "./actions";

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, { error: null });

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6">
      <h1 className="font-display text-2xl font-bold text-ink">Setează o parolă nouă</h1>

      <form action={formAction} className="mt-6 flex flex-col gap-3">
        <label className="text-sm font-medium text-ink">
          Parolă nouă
          <input
            type="password"
            name="password"
            required
            minLength={8}
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Confirmă parola
          <input
            type="password"
            name="confirmare"
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
          {pending ? "Se salvează..." : "Salvează parola"}
        </button>
      </form>
    </main>
  );
}
