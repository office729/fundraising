"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import { doneazaAction, type DoneazaState } from "./actions";

const INITIAL: DoneazaState = { error: null };
const SUME_RAPIDE = [25, 50, 100, 250];

export function DoneazaForm({ orgSlug, pageSlug }: { orgSlug: string; pageSlug: string; titlu: string }) {
  const action = doneazaAction.bind(null, orgSlug, pageSlug);
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [suma, setSuma] = useState(50);
  const [recurenta, setRecurenta] = useState(false);

  return (
    <form action={formAction} className="mt-4 flex flex-col gap-3">
      {/* Honeypot — invizibil pentru oameni. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div className="inline-flex self-start overflow-hidden rounded-lg border border-line text-sm font-bold">
        <button
          type="button"
          onClick={() => setRecurenta(false)}
          className={`px-4 py-2 transition ${!recurenta ? "bg-brand-green text-white" : "bg-panel text-ink"}`}
        >
          O singură dată
        </button>
        <button
          type="button"
          onClick={() => setRecurenta(true)}
          className={`px-4 py-2 transition ${recurenta ? "bg-brand-green text-white" : "bg-panel text-ink"}`}
        >
          Lunar
        </button>
      </div>
      <input type="hidden" name="recurenta" value={recurenta ? "1" : ""} />

      <div className="flex flex-wrap gap-2">
        {SUME_RAPIDE.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSuma(s)}
            className={`rounded-full border px-4 py-1.5 text-sm font-bold transition ${
              suma === s ? "border-brand-green bg-brand-green-soft text-brand-green" : "border-line text-ink hover:border-brand-blue"
            }`}
          >
            {s} lei
          </button>
        ))}
      </div>
      <label className="text-sm font-medium text-ink">
        Sumă (lei)
        <input
          type="number"
          name="suma"
          min={5}
          max={50000}
          value={suma}
          onChange={(e) => setSuma(Number(e.target.value))}
          className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
        />
      </label>
      <label className="text-sm font-medium text-ink">
        Numele tău
        <input name="numeDonator" required className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink" />
      </label>
      <label className="text-sm font-medium text-ink">
        Email
        <input type="email" name="emailDonator" required className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink" />
      </label>
      <label className="text-sm font-medium text-ink">
        Telefon (opțional)
        <input type="tel" name="telefonDonator" className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink" />
      </label>
      <label className="text-sm font-medium text-ink">
        Mesaj (opțional)
        <textarea name="mesaj" rows={2} className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink" />
      </label>
      <label className="flex items-center gap-2 text-sm text-body">
        <input type="checkbox" name="anonim" className="h-4 w-4 rounded border-line" />
        Nu-mi afișa numele public (rămâne vizibil organizației)
      </label>

      <div className="mt-1 flex flex-col gap-2 border-t border-line pt-3">
        <label className="flex items-start gap-2 text-[13px] text-body">
          <input type="checkbox" name="consimtamantGdpr" required className="mt-0.5 h-4 w-4 rounded border-line" />
          <span>
            Sunt de acord cu{" "}
            <Link href="/gdpr" target="_blank" className="font-medium text-brand-green hover:underline">
              Politica de prelucrare a datelor cu caracter personal
            </Link>
          </span>
        </label>
        <label className="flex items-start gap-2 text-[13px] text-body">
          <input type="checkbox" name="consimtamantTermeni" required className="mt-0.5 h-4 w-4 rounded border-line" />
          <span>
            Sunt de acord cu{" "}
            <Link href="/termeni" target="_blank" className="font-medium text-brand-green hover:underline">
              Termenii și Condițiile de utilizare
            </Link>
          </span>
        </label>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 rounded-md bg-brand-green px-4 py-3 text-center font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-60"
      >
        {pending ? "Se pregătește plata..." : recurenta ? `Donează ${suma} lei/lună` : `Donează ${suma} lei`}
      </button>
      <p className="text-center text-[11px] text-muted-2">Plata se face securizat, pe pagina Stripe — metodele afișate acolo depind de dispozitiv.</p>
    </form>
  );
}
