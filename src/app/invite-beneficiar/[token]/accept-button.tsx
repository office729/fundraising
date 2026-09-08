"use client";

import { useActionState } from "react";

import { acceptBeneficiaryInviteAction } from "./actions";

export function AcceptButton({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState<{ error: string | null }, FormData>(
    () => acceptBeneficiaryInviteAction(token),
    { error: null },
  );

  return (
    <form action={formAction}>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-brand-green px-6 py-2.5 font-medium text-white transition hover:bg-brand-green-hover disabled:opacity-60"
      >
        {pending ? "Se acceptă..." : "Acceptă și intră în panoul tău"}
      </button>
      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
