"use client";

import { useActionState } from "react";

import type { Locale } from "@/lib/i18n/config";
import { DEZABONARE_UI_DICT } from "@/lib/i18n/dictionaries/dezabonare-ui";

import { dezaboneazaAction, type DezabonareState } from "./actions";

// Alegerea donatorului: ca până acum, mai rar sau deloc. Se aplică doar la apăsarea butonului (nu la deschiderea linkului: scanerele de e-mail deschid linkurile singure).
export function DezabonareForm({ o, e, t, organizatie, frecventa, locale }: { o: string; e: string; t: string; organizatie: string; frecventa: "normala" | "rara"; locale: Locale }) {
  const d = DEZABONARE_UI_DICT[locale].donator;
  const [state, formAction, pending] = useActionState<DezabonareState, FormData>(dezaboneazaAction, { ok: false, error: null });

  if (state.ok) {
    return (
      <p role="status" className="text-sm text-body">
        {d.finale[state.rezultat ?? "deloc"]}
      </p>
    );
  }
  const optiune = "flex min-h-12 cursor-pointer items-start gap-3 rounded-lg border border-line bg-panel px-3 py-2.5 text-sm text-ink has-[:checked]:border-brand-green";
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="o" value={o} />
      <input type="hidden" name="e" value={e} />
      <input type="hidden" name="t" value={t} />
      <fieldset className="space-y-2">
        <legend className="sr-only">{d.legenda(organizatie)}</legend>
        <label className={optiune}>
          <input type="radio" name="alegere" value="normala" defaultChecked={frecventa === "normala"} className="mt-0.5 size-5 shrink-0" />
          <span>
            <strong>{d.normalaTitlu}</strong>{d.normalaDesc}
          </span>
        </label>
        <label className={optiune}>
          <input type="radio" name="alegere" value="rara" defaultChecked={frecventa === "rara"} className="mt-0.5 size-5 shrink-0" />
          <span>
            <strong>{d.rarTitlu}</strong>{d.rarDesc}
          </span>
        </label>
        <label className={optiune}>
          <input type="radio" name="alegere" value="deloc" className="mt-0.5 size-5 shrink-0" />
          <span>
            <strong>{d.delocTitlu}</strong>{d.delocDesc(organizatie)}
          </span>
        </label>
      </fieldset>
      {state.error && (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-lg bg-brand-green px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-50"
      >
        {pending ? d.seProceseaza : d.salveaza}
      </button>
    </form>
  );
}
