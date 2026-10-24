"use client";

import { useActionState } from "react";

import { dezaboneazaAction, type DezabonareState } from "./actions";

const MESAJE_FINALE: Record<string, string> = {
  deloc: "Te-ai dezabonat. Nu vei mai primi e-mailuri de la această organizație.",
  rara: "Am notat: vei primi mesaje mai rar, cel mult unul pe lună.",
  normala: "Am notat: vei primi mesaje ca până acum.",
};

// Alegerea donatorului: ca până acum, mai rar sau deloc. Se aplică doar la apăsarea butonului (nu la deschiderea linkului: scanerele de e-mail deschid linkurile singure).
export function DezabonareForm({ o, e, t, organizatie, frecventa }: { o: string; e: string; t: string; organizatie: string; frecventa: "normala" | "rara" }) {
  const [state, formAction, pending] = useActionState<DezabonareState, FormData>(dezaboneazaAction, { ok: false, error: null });

  if (state.ok) {
    return (
      <p role="status" className="text-sm text-body">
        {MESAJE_FINALE[state.rezultat ?? "deloc"]}
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
        <legend className="sr-only">Cât de des vrei să primești mesaje de la {organizatie}</legend>
        <label className={optiune}>
          <input type="radio" name="alegere" value="normala" defaultChecked={frecventa === "normala"} className="mt-0.5 size-5 shrink-0" />
          <span>
            <strong>Ca până acum.</strong> Mesaje rare: mulțumiri, vești despre proiecte, o invitație din când în când.
          </span>
        </label>
        <label className={optiune}>
          <input type="radio" name="alegere" value="rara" defaultChecked={frecventa === "rara"} className="mt-0.5 size-5 shrink-0" />
          <span>
            <strong>Mai rar.</strong> Cel mult un mesaj pe lună.
          </span>
        </label>
        <label className={optiune}>
          <input type="radio" name="alegere" value="deloc" className="mt-0.5 size-5 shrink-0" />
          <span>
            <strong>Nu mai vreau deloc e-mailuri</strong> de la {organizatie}.
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
        {pending ? "Se procesează..." : "Salvează alegerea"}
      </button>
    </form>
  );
}
