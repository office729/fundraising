"use client";

import Link from "next/link";

import { CAMPAIGN_TEMPLATES, type CampaignPageTemplate } from "@/lib/campaign-templates";
import type { Locale } from "@/lib/i18n/config";
import { CAMPANII_SECTIUNE_UI_DICT } from "@/lib/i18n/dictionaries/campanii-sectiune-ui";
import { SF_PUBLIC_UI_DICT } from "@/lib/i18n/dictionaries/sf-public-ui";

import { creeazaPaginaAction, type CreeazaPaginaState } from "./actions";
import { useActionStatePastrat } from "@/lib/use-action-state-pastrat";

const INITIAL: CreeazaPaginaState = { error: null };

export function CreeazaPaginaForm({
  locale,
  orgSlug,
  orgName,
  templateuriDisponibile,
}: {
  locale: Locale;
  orgSlug: string;
  orgName: string;
  templateuriDisponibile: CampaignPageTemplate[];
}) {
  const t = SF_PUBLIC_UI_DICT[locale].creeaza;
  const action = creeazaPaginaAction.bind(null, orgSlug);
  const [state, formAction, pending, valori] = useActionStatePastrat(action, INITIAL);

  return (
    <main className="mx-auto min-h-screen max-w-lg px-6 py-16">
      <p className="text-xs font-bold tracking-wide text-brand-green uppercase">{orgName}</p>
      <h1 className="font-display mt-1 text-2xl font-bold text-ink">{t.titlu}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-muted">{t.intro(orgName)}</p>

      <form action={formAction} className="mt-7 flex flex-col gap-4">
        {/* Honeypot — invizibil pentru oameni. */}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

        <label className="text-sm font-medium text-ink">
          {t.numeTau}
          <input
            name="numeCreator"
            defaultValue={valori.numeCreator}
            required
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          {t.email}
          <input
            type="email"
            name="emailCreator"
            defaultValue={valori.emailCreator}
            required
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          {t.titluPagina}
          <input
            name="titlu"
            defaultValue={valori.titlu}
            required
            placeholder={t.titluPlaceholder}
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        <label className="text-sm font-medium text-ink">
          {t.poveste}
          <textarea
            name="poveste"
            defaultValue={valori.poveste}
            required
            rows={6}
            placeholder={t.povestePlaceholder}
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>
        {templateuriDisponibile.length > 1 && (
          <div>
            <span className="text-sm font-medium text-ink">{t.design}</span>
            <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {templateuriDisponibile.map((id, i) => {
                const tpl = CAMPAIGN_TEMPLATES[id];
                return (
                  <label key={id} className="cursor-pointer" data-domeniu={id}>
                    <input type="radio" name="template" value={id} defaultChecked={i === 0} className="peer sr-only" />
                    <div className="h-14 w-full rounded-lg border border-line bg-gradient-to-br from-brand-blue to-brand-green peer-checked:border-brand-green peer-checked:ring-2 peer-checked:ring-brand-green" />
                    <span className="mt-1.5 block text-center text-[12px] font-medium text-body">{locale === "ro" ? tpl.nume : (CAMPANII_SECTIUNE_UI_DICT[locale].domenii[id] ?? tpl.nume)}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        <label className="text-sm font-medium text-ink">
          {t.sumaTinta}
          <input
            type="number"
            name="sumaTinta"
            defaultValue={valori.sumaTinta}
            min={1}
            step={1}
            placeholder={t.sumaPlaceholder}
            className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
          />
        </label>

        <section aria-label={t.informareAria} className="border-t border-line pt-4 text-[12px] leading-relaxed text-body">
          <p className="font-medium text-ink">{t.informareTitlu}</p>
          <ul className="mt-1.5 list-disc space-y-1 pl-4">
            <li>
              {t.operator}<strong>{orgName}</strong>{t.operatorGazduit}
            </li>
            <li>{t.ceDate}</li>
            <li>{t.pentruCe}</li>
            <li>
              {t.drepturi1}{orgName}{t.drepturi2}{" "}
              <a href="mailto:vlad.placinta@alexandrit.ro" className="font-medium text-brand-green hover:underline">
                vlad.placinta@alexandrit.ro
              </a>
              {t.drepturi3}{" "}
              <Link href="/gdpr" target="_blank" className="font-medium text-brand-green hover:underline">
                {t.politica}
              </Link>
              .
            </li>
          </ul>
        </section>
        <label className="flex items-start gap-2 text-[13px] text-body">
          <input type="checkbox" name="consimtamantGdpr" required className="mt-0.5 h-4 w-4 rounded border-line" />
          <span>{t.consimtamant}</span>
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 rounded-md bg-brand-green px-4 py-2.5 font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-60"
        >
          {pending ? t.seCreeaza : t.creeazaPagina}
        </button>
      </form>
    </main>
  );
}
