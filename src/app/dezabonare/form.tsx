"use client";

import { useActionState } from "react";

import { dezaboneazaAction, type DezabonareState } from "./actions";

export function DezabonareForm({ o, e, t }: { o: string; e: string; t: string }) {
  const [state, formAction, pending] = useActionState<DezabonareState, FormData>(dezaboneazaAction, { ok: false, error: null });

  if (state.ok) {
    return <p className="text-sm text-body">Te-ai dezabonat. Nu vei mai primi emailuri de campanie de la această organizație.</p>;
  }
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="o" value={o} />
      <input type="hidden" name="e" value={e} />
      <input type="hidden" name="t" value={t} />
      {state.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-green px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-50"
      >
        {pending ? "Se procesează..." : "Confirmă dezabonarea"}
      </button>
    </form>
  );
}
