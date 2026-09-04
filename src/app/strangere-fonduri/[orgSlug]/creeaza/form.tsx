"use client";

import Link from "next/link";
import { useActionState } from "react";

import { creeazaPaginaAction, type CreeazaPaginaState } from "./actions";

const INITIAL: CreeazaPaginaState = { error: null };

export function CreeazaPaginaForm({ orgSlug, orgName }: { orgSlug: string; orgName: string }) {
  const action = creeazaPaginaAction.bind(null, orgSlug);
  const [state, formAction, pending] = useActionState(action, INITIAL);

  return (
    <main className="mx-auto min-h-screen max-w-lg px-6 py-16">
      <p className="text-xs font-bold tracking-wide text-brand-green uppercase">{orgName}</p>
      <h1 className="font-display mt-1 text-2xl font-bold text-ink">Creează-ți propria pagină de strângere fonduri</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">
        Spune povestea ta, alege o sumă țintă (opțional) și distribuie link-ul prin WhatsApp, email sau social
        media — fiecare donație merge direct către {orgName}.
      </p>

      <form action={formAction} className="mt-7 flex flex-col gap-4">
        {/* Honeypot — invizibil pentru oameni. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

        <label className="text-sm font-medium text-ink">
          Numele tău
          <input
            name="numeCreator"
            required
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Email
          <input
            type="email"
            name="emailCreator"
            required
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Titlul paginii
          <input
            name="titlu"
            required
            placeholder="ex. Alerg pentru Salvează o Inimă"
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Povestea ta
          <textarea
            name="poveste"
            required
            rows={6}
            placeholder="De ce strângi fonduri pentru această cauză?"
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Sumă țintă (lei) — opțional
          <input
            type="number"
            name="sumaTinta"
            min={1}
            step={1}
            placeholder="ex. 2000"
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>

        <label className="flex items-start gap-2 border-t border-line pt-4 text-[13px] text-body">
          <input type="checkbox" name="consimtamantGdpr" required className="mt-0.5 h-4 w-4 rounded border-line" />
          <span>
            Sunt de acord ca numele și povestea de mai sus să fie publicate pe pagină, conform{" "}
            <Link href="/gdpr" target="_blank" className="font-medium text-brand-green hover:underline">
              Politicii de prelucrare a datelor cu caracter personal
            </Link>
            .
          </span>
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-brand-green px-4 py-2.5 font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-60"
        >
          {pending ? "Se creează pagina..." : "Creează pagina"}
        </button>
      </form>
    </main>
  );
}
