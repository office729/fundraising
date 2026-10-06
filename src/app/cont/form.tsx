"use client";

import { useActionState } from "react";

import { stergeContulMeuAction, type StergeContState } from "./actions";

export function StergeContForm({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState<StergeContState, FormData>(stergeContulMeuAction, { error: null });
  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      <label className="text-sm font-medium text-ink">
        Pentru confirmare, scrie adresa de email a contului ({email})
        <input
          name="confirmare"
          type="email"
          autoComplete="off"
          required
          className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
      >
        {pending ? "Se șterge…" : "Șterge definitiv contul meu"}
      </button>
    </form>
  );
}
