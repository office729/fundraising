"use client";

import { AuthShell } from "../auth-shell";
import { PasswordField } from "../password-field";
import { useActionState } from "react";

import type { Locale } from "@/lib/i18n/config";
import type { AUTH_DICT } from "@/lib/i18n/dictionaries/auth";

import { resetPasswordAction } from "./actions";

export function ResetPasswordForm({ dict }: { dict: (typeof AUTH_DICT)[Locale] }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, { error: null });

  return (
    <AuthShell>
      <h1 className="text-center font-display text-2xl font-bold text-ink">{dict.resetPassword.titlu}</h1>

      <form action={formAction} className="mt-6 flex flex-col gap-3">
        <PasswordField
          label={dict.resetPassword.parolaNoua}
          name="password"
          autoComplete="new-password"
          minLength={8}
          hint={dict.parolaIndiciu}
          arata={dict.arataParola}
          ascunde={dict.ascundeParola}
        />
        <PasswordField
          label={dict.resetPassword.confirmaParola}
          name="confirmare"
          autoComplete="new-password"
          minLength={8}
          arata={dict.arataParola}
          ascunde={dict.ascundeParola}
        />

        {state.error && (
          <p role="alert" className="text-sm text-red-600">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-lg bg-brand-green px-4 py-2.5 font-medium text-white transition hover:bg-brand-green-hover disabled:opacity-60"
        >
          {pending ? dict.resetPassword.seSalveaza : dict.resetPassword.submit}
        </button>
      </form>
    </AuthShell>
  );
}
