"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import type { Locale } from "@/lib/i18n/config";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";

import {
  activeazaDomeniuPlataAction,
  deconecteazaStripeDonatii,
  salveazaStripeDonatiiAction,
  type StripeDonatiiState,
  type StripeDonatiiStatus,
} from "./stripe-donatii-actions";

const EVENIMENTE = [
  "checkout.session.completed",
  "checkout.session.expired",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "invoice.paid",
  "charge.refunded",
  "charge.dispute.created",
  "charge.dispute.closed",
  "customer.subscription.deleted",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
];

const input =
  "mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 font-mono text-sm text-ink placeholder:text-muted-2 focus:border-brand-blue focus:outline-none";

// Donațiile de pe paginile de campanie ale ONG-ului se încasează în contul lui
// Stripe, nu al platformei. Aici își conectează contul: cheia secretă (criptată
// la salvare, nu se mai afișează niciodată) + secretul webhook-ului, ca să știm
// când o donație s-a confirmat.
export function StripeDonatiiSection({
  orgSlug,
  webhookUrl,
  status,
  locale,
}: {
  orgSlug: string;
  webhookUrl: string;
  status: StripeDonatiiStatus;
  locale: Locale;
}) {
  const dict = SETARI_ECHIPA_DICT[locale].orgSetari.stripeDonatii;
  const router = useRouter();
  const [state, formAction, pending] = useActionState<StripeDonatiiState, FormData>(
    salveazaStripeDonatiiAction.bind(null, orgSlug),
    { error: null, ok: false },
  );
  const [deconectare, startDeconectare] = useTransition();
  const [copiat, setCopiat] = useState(false);
  const [activareDomeniu, startActivareDomeniu] = useTransition();
  const [eroareDomeniu, setEroareDomeniu] = useState<string | null>(null);

  // După o salvare reușită, reîncarcăm statusul (badge „Conectat", indiciu cheie).
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);

  async function copiaza() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      // clipboard indisponibil — URL-ul rămâne selectabil manual
    }
  }

  const pregatit = status.conectat && status.areWebhook;

  return (
    <section className="mt-8 border-t border-line pt-6">
      <h2 className="font-display text-lg font-bold text-ink">{dict.title}</h2>
      <p className="mt-1 text-sm text-muted">
        {dict.introBefore}
        <strong>{dict.introBold}</strong>
        {dict.introAfter}
      </p>

      <p
        className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
          pregatit ? "bg-brand-green-soft text-brand-green" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        }`}
      >
        {pregatit
          ? dict.badge.conectat(status.hint ?? "")
          : status.conectat
            ? dict.badge.cheieSalvata
            : dict.badge.neconectat}
      </p>

      {!status.criptareActiva && (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {dict.criptareInactiva}
        </p>
      )}

      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-body">
        {dict.pasi.map((pas, i) => (
          <li key={i}>
            {pas.map((parte, j) =>
              parte.strong ? (
                <strong key={j}>{parte.text}</strong>
              ) : parte.em ? (
                <em key={j}>{parte.text}</em>
              ) : parte.code ? (
                <code key={j}>{parte.text}</code>
              ) : (
                <span key={j}>{parte.text}</span>
              ),
            )}
          </li>
        ))}
      </ol>

      <div className="mt-4">
        <p className="text-xs font-semibold text-ink">{dict.webhookLabel}</p>
        <div className="mt-1 flex items-center gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-line bg-panel-2 px-3 py-2 text-xs text-body">
            {webhookUrl}
          </code>
          <button
            type="button"
            onClick={copiaza}
            className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink transition hover:bg-panel-2"
          >
            {copiat ? dict.copiat : dict.copiaza}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">{dict.evenimenteLabel(EVENIMENTE.join(", "))}</p>
      </div>

      <form action={formAction} className="mt-5 space-y-4">
        <label className="block text-sm font-medium text-ink">
          {dict.cheieLabel}
          <input
            name="cheieSecreta"
            type="password"
            autoComplete="off"
            placeholder={status.conectat ? dict.cheiePlaceholderPastreaza : dict.cheiePlaceholderNou}
            className={input}
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          {dict.webhookSecretLabel}
          <input
            name="secretWebhook"
            type="password"
            autoComplete="off"
            placeholder={status.areWebhook ? dict.webhookPlaceholderPastreaza : dict.webhookPlaceholderNou}
            className={input}
          />
        </label>

        <div className="border-t border-line pt-4">
          <p className="text-sm font-semibold text-ink">{dict.expres.title}</p>
          <p className="mt-1 text-xs text-muted">{dict.expres.descriere}</p>
          <p className="mt-1 text-xs text-muted">{dict.expres.scopRecurenta}</p>
          <label className="mt-3 block text-sm font-medium text-ink">
            {dict.expres.cheiePublicabilaLabel}
            <input
              name="cheiePublicabila"
              type="text"
              autoComplete="off"
              placeholder={status.publishableKey ? dict.expres.cheiePublicabilaPlaceholderPastreaza : dict.expres.cheiePublicabilaPlaceholderNou}
              className={input}
            />
          </label>
          <p className="mt-1 text-xs text-muted">{dict.expres.cheiePublicabilaPas}</p>
        </div>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.ok && !state.error && <p className="text-sm text-brand-green-hover">{dict.salvat}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending || !status.criptareActiva}
            className="rounded-lg bg-brand-green px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-50"
          >
            {pending ? dict.seSalveaza : dict.salveaza}
          </button>
          {status.conectat && (
            <button
              type="button"
              disabled={deconectare}
              onClick={() =>
                startDeconectare(async () => {
                  await deconecteazaStripeDonatii(orgSlug);
                  router.refresh();
                })
              }
              className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-muted transition hover:text-red-600 disabled:opacity-50"
            >
              {dict.deconecteaza}
            </button>
          )}
        </div>
        <p className="text-xs text-muted">{dict.footNote}</p>
      </form>

      {status.conectat && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="text-sm font-semibold text-ink">{dict.expres.domeniuTitle}</p>
          <p className="mt-1 text-xs text-muted">
            {status.domeniuVerificatLa
              ? dict.expres.domeniuVerificatLa(new Date(status.domeniuVerificatLa).toLocaleDateString(locale === "ro" ? "ro-RO" : "en-US"))
              : dict.expres.domeniuNeverificat}
          </p>
          {eroareDomeniu && <p className="mt-2 text-sm text-red-600">{eroareDomeniu}</p>}
          <button
            type="button"
            disabled={activareDomeniu}
            onClick={() =>
              startActivareDomeniu(async () => {
                setEroareDomeniu(null);
                const rezultat = await activeazaDomeniuPlataAction(orgSlug);
                if (!rezultat.ok) {
                  setEroareDomeniu(rezultat.error);
                  return;
                }
                router.refresh();
              })
            }
            className="mt-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition hover:bg-panel-2 disabled:opacity-50"
          >
            {activareDomeniu ? dict.expres.seActiveaza : dict.expres.activeazaDomeniu}
          </button>
        </div>
      )}
    </section>
  );
}
