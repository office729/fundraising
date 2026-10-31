"use client";

import { useActionState } from "react";

import type { Locale } from "@/lib/i18n/config";
import { BENEFICIAR_PORTAL_UI_DICT } from "@/lib/i18n/dictionaries/beneficiar-portal-ui";

import { schimbaParolaBeneficiarAction, type SchimbaParolaState } from "../actions";

const START: SchimbaParolaState = { error: null, ok: false };

export function ParolaForm({ locale }: { locale: Locale }) {
  const t = BENEFICIAR_PORTAL_UI_DICT[locale].profil;
  const [state, formAction, pending] = useActionState(schimbaParolaBeneficiarAction, START);

  return (
    <form action={formAction} className="mt-3 flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <label htmlFor="parola" className="text-[12px] font-medium text-muted">
          {t.parolaNoua}
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
          {t.confirmaParola}
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
      {state.ok && <p className="text-[13px] text-brand-green">{t.parolaOk}</p>}
      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-green px-4 py-2 text-[13.5px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {pending ? t.seSalveaza : t.schimbaParola}
        </button>
      </div>
    </form>
  );
}
