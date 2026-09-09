"use client";

import { useActionState } from "react";

import { schimbaParolaBeneficiarAction, type SchimbaParolaState } from "../actions";

const START: SchimbaParolaState = { error: null, ok: false };

export function ParolaForm() {
  const [state, formAction, pending] = useActionState(schimbaParolaBeneficiarAction, START);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="parola" className="text-[12px] font-medium text-muted">
          Parolă nouă
        </label>
        <input
          id="parola"
          name="parola"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="rounded-lg border border-line bg-body px-3 py-2 text-[14px] text-ink outline-none focus:border-brand-green"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="confirmare" className="text-[12px] font-medium text-muted">
          Confirmă parola
        </label>
        <input
          id="confirmare"
          name="confirmare"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="rounded-lg border border-line bg-body px-3 py-2 text-[14px] text-ink outline-none focus:border-brand-green"
        />
      </div>
      {state.error && <p className="text-[13px] text-red-600">{state.error}</p>}
      {state.ok && <p className="text-[13px] text-brand-green">Parola a fost schimbată cu succes.</p>}
      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-green px-4 py-2 text-[13.5px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Se salvează…" : "Schimbă parola"}
        </button>
      </div>
    </form>
  );
}
