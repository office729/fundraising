"use client";

import { useActionState } from "react";

import { dezaboneazaNotificareAction, type DezabonareNotificareState } from "./actions";

export function DezabonareNotificareForm({ tip, u, t }: { tip: string; u: string; t: string }) {
  const [state, formAction, pending] = useActionState<DezabonareNotificareState, FormData>(dezaboneazaNotificareAction, { ok: false, error: null });

  if (state.ok) {
    return <p role="status" className="text-sm text-body">Gata, te-ai dezabonat. Nu vei mai primi acest e-mail. Te poți reabona oricând din „Contul meu”, din aplicație.</p>;
  }
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="tip" value={tip} />
      <input type="hidden" name="u" value={u} />
      <input type="hidden" name="t" value={t} />
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="rounded-lg bg-brand-green px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-50">
        {pending ? "Se procesează..." : "Confirmă dezabonarea"}
      </button>
    </form>
  );
}
