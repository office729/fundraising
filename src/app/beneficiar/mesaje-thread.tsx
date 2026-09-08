"use client";

import { useActionState, useEffect } from "react";

import { trimiteMesajBeneficiarAction, type TrimiteMesajBeneficiarState } from "./actions";

export type MesajRow = { id: string; continut: string; createdAt: string; suntEu: boolean; senderNume: string | null; senderEmail: string };

const INITIAL: TrimiteMesajBeneficiarState = { error: null, ok: false };

export function MesajeThread({ mesaje }: { mesaje: MesajRow[] }) {
  const [state, formAction, pending] = useActionState(trimiteMesajBeneficiarAction, INITIAL);

  useEffect(() => {
    if (state.ok) window.location.reload();
  }, [state.ok]);

  return (
    <div className="rounded-xl border border-line bg-panel p-5">
      <h2 className="font-display text-sm font-bold text-ink">Mesaje</h2>
      {mesaje.length ? (
        <div className="mt-3 mb-3 flex max-h-80 flex-col gap-2 overflow-y-auto">
          {[...mesaje].reverse().map((m) => (
            <div key={m.id} className={`rounded-lg border px-3.5 py-2.5 ${m.suntEu ? "border-brand-green bg-brand-green-soft/40" : "border-line"}`}>
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-semibold text-ink">{m.suntEu ? "Tu" : m.senderNume || m.senderEmail}</span>
                <span className="text-[11px] text-muted-2">{new Date(m.createdAt).toLocaleString("ro-RO")}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-[13px] text-ink">{m.continut}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-muted-2">Niciun mesaj încă — scrie primul mesaj mai jos.</p>
      )}
      <form action={formAction} className="mt-2 flex items-end gap-2">
        <textarea
          name="continut"
          required
          rows={2}
          className="flex-1 rounded-lg border border-line bg-panel-2 px-3 py-2 text-sm"
          placeholder="Scrie un mesaj..."
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-brand-green px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-60"
        >
          {pending ? "..." : "Trimite"}
        </button>
      </form>
      {state.error && <p className="mt-2 text-[13px] text-red-600">{state.error}</p>}
    </div>
  );
}
