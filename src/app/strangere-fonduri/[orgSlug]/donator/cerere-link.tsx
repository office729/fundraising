"use client";

import { useActionState } from "react";

import type { Locale } from "@/lib/i18n/config";
import { PORTAL_DONATOR_DICT } from "@/lib/i18n/dictionaries/portal-donator";

import { cereLinkAction, type StareCerere } from "./actions";

export function CerereLink({ orgSlug, locale }: { orgSlug: string; locale: Locale }) {
  const t = PORTAL_DONATOR_DICT[locale].cere;
  const [stare, actiune, pending] = useActionState<StareCerere, FormData>(cereLinkAction.bind(null, orgSlug), { ok: false, mesaj: null });
  return (
    <form action={actiune} className="mt-6 space-y-3">
      <label className="block text-[14px] font-medium text-ink" htmlFor="email-donator">
        {t.emailEticheta}
      </label>
      <input
        id="email-donator"
        name="email"
        type="email"
        required
        autoComplete="email"
        className="w-full rounded-lg border border-line bg-panel px-3.5 py-3 text-[15px] text-ink focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/20 focus:outline-none"
      />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand-green px-5 py-3 text-[15px] font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-60 sm:w-auto"
      >
        {pending ? t.seTrimite : t.buton}
      </button>
      {stare.mesaj && (
        <p role="status" className={`rounded-lg px-4 py-3 text-[14px] leading-relaxed ${stare.ok ? "bg-brand-green-soft text-ink" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200"}`}>
          {stare.mesaj}
        </p>
      )}
    </form>
  );
}
