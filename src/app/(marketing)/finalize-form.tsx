"use client";

import { useActionState } from "react";

import { finalizeazaOrganizatiaAction } from "./finalize-actions";

export function FinalizeForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(finalizeazaOrganizatiaAction, { error: null });

  return (
    <main className="mx-auto flex max-w-sm flex-col justify-center px-6 py-24">
      <h1 className="font-display text-2xl font-bold text-ink">Încă un pas</h1>
      <p className="mt-1 text-sm text-muted">
        Ești autentificat(ă) ca <strong>{email}</strong>. Cum se numește organizația pentru care creezi contul?
      </p>

      <form action={formAction} className="mt-6 flex flex-col gap-3">
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
