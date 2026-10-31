"use client";

import { useActionState } from "react";

import type { Locale } from "@/lib/i18n/config";
import { INVITE_UI_DICT } from "@/lib/i18n/dictionaries/invite-ui";

import { acceptBeneficiaryInviteAction } from "./actions";

export function AcceptButton({ token, locale }: { token: string; locale: Locale }) {
  const t = INVITE_UI_DICT[locale].beneficiar;
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
        {pending ? t.seAccepta : t.accepta}
      </button>
      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
