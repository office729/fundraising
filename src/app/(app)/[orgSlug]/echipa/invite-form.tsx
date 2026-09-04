"use client";

import { useActionState } from "react";

import type { Locale } from "@/lib/i18n/config";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";
import { createInviteAction, type InviteState } from "./actions";

export function InviteForm({ orgSlug, locale }: { orgSlug: string; locale: Locale }) {
  const dict = SETARI_ECHIPA_DICT[locale].echipa.inviteForm;
  const boundAction = createInviteAction.bind(null, orgSlug);
  const [state, formAction, pending] = useActionState<InviteState, FormData>(boundAction, {
    error: null,
    token: null,
  });
  const inviteLink =
    state.token && typeof window !== "undefined" ? `${window.location.origin}/invite/${state.token}` : null;

  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <h2 className="font-medium text-ink">{dict.title}</h2>
      <form action={formAction} className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex-1 text-sm font-medium text-ink" style={{ minWidth: 200 }}>
          {dict.email}
          <input
            type="email"
            name="email"
            required
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          {dict.rol}
          <select name="role" className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink">
            <option value="member">{dict.membru}</option>
            <option value="admin">{dict.admin}</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-brand-green px-4 py-2.5 font-medium text-white transition hover:bg-brand-green-hover disabled:opacity-60"
        >
          {pending ? dict.seTrimite : dict.invita}
        </button>
      </form>
      {state.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {inviteLink && (
        <div className="mt-3 rounded-lg bg-brand-green-soft p-3 text-sm">
          <p className="font-medium text-ink">{dict.linkInvitatie}</p>
          <p className="mt-1 font-mono text-xs break-all text-ink">{inviteLink}</p>
        </div>
      )}
    </div>
  );
}
