"use client";

import Link from "next/link";

import { CAMPAIGN_TEMPLATES, type CampaignPageTemplate } from "@/lib/campaign-templates";

import { creeazaPaginaAction, type CreeazaPaginaState } from "./actions";
import { useActionStatePastrat } from "@/lib/use-action-state-pastrat";

const INITIAL: CreeazaPaginaState = { error: null };

export function CreeazaPaginaForm({
  orgSlug,
  orgName,
  templateuriDisponibile,
}: {
  orgSlug: string;
  orgName: string;
  templateuriDisponibile: CampaignPageTemplate[];
}) {
  const action = creeazaPaginaAction.bind(null, orgSlug);
  const [state, formAction, pending, valori] = useActionStatePastrat(action, INITIAL);

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
            defaultValue={valori.numeCreator}
            required
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Email
          <input
            type="email"
            name="emailCreator"
            defaultValue={valori.emailCreator}
            required
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Titlul paginii
          <input
            name="titlu"
            defaultValue={valori.titlu}
            required
            placeholder="ex. Alerg pentru Salvează o Inimă"
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          Povestea ta
          <textarea
            name="poveste"
            defaultValue={valori.poveste}
            required
            rows={6}
            placeholder="De ce strângi fonduri pentru această cauză?"
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        {templateuriDisponibile.length > 1 && (
          <div>
            <span className="text-sm font-medium text-ink">Design-ul paginii</span>
            <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {templateuriDisponibile.map((id, i) => {
                const tpl = CAMPAIGN_TEMPLATES[id];
                return (
                  <label key={id} className="cursor-pointer" data-domeniu={id}>
                    <input type="radio" name="template" value={id} defaultChecked={i === 0} className="peer sr-only" />
                    <div className="h-14 w-full rounded-lg border border-line bg-gradient-to-br from-brand-blue to-brand-green peer-checked:border-brand-green peer-checked:ring-2 peer-checked:ring-brand-green" />
                    <span className="mt-1.5 block text-center text-[12px] font-medium text-body">{tpl.nume}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <label className="text-sm font-medium text-ink">
          Sumă țintă (lei) — opțional
          <input
            type="number"
            name="sumaTinta"
            defaultValue={valori.sumaTinta}
            min={1}
            step={1}
            placeholder="ex. 2000"
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>

        <section aria-label="Informare privind datele personale" className="border-t border-line pt-4 text-[12px] leading-relaxed text-body">
          <p className="font-medium text-ink">Cum îți folosim datele (informare)</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>
              Operator: <strong>{orgName}</strong>. Platforma Alexandrit (MEDIGROUPPLUS SRL) găzduiește tehnic pagina, ca persoană împuternicită.
            </li>
            <li>Ce date: numele, emailul tău (rămâne vizibil doar organizației) și povestea; numele și povestea devin publice pe pagina creată.</li>
            <li>
              Pentru ce: crearea și administrarea paginii tale de campanie, pe baza consimțământului tău, pe care îl poți retrage oricând cerând
              ștergerea paginii. Nu include în poveste date medicale sau despre minori fără acordul persoanelor în cauză.
            </li>
            <li>
              Drepturile tale (acces, rectificare, ștergere, opoziție, portabilitate): adresează-te organizației {orgName} sau scrie la{" "}
              <a href="mailto:vlad.placinta@alexandrit.ro" className="font-medium text-brand-green hover:underline">
                vlad.placinta@alexandrit.ro
              </a>
              ; plângere la ANSPDCP. Detalii în{" "}
              <Link href="/gdpr" target="_blank" className="font-medium text-brand-green hover:underline">
                politica de confidențialitate a platformei
              </Link>
              .
            </li>
          </ul>
        </section>
        <label className="flex items-start gap-2 text-[13px] text-body">
          <input type="checkbox" name="consimtamantGdpr" required className="mt-0.5 h-4 w-4 rounded border-line" />
          <span>Am citit informarea de mai sus și sunt de acord ca numele și povestea să fie publicate pe pagina de campanie.</span>
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
