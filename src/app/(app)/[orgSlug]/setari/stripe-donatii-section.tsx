"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";

import {
  deconecteazaStripeDonatii,
  salveazaStripeDonatiiAction,
  type StripeDonatiiState,
  type StripeDonatiiStatus,
} from "./stripe-donatii-actions";

const EVENIMENTE = [
  "checkout.session.completed",
  "checkout.session.expired",
  "invoice.paid",
  "charge.refunded",
  "charge.dispute.created",
  "customer.subscription.deleted",
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
}: {
  orgSlug: string;
  webhookUrl: string;
  status: StripeDonatiiStatus;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<StripeDonatiiState, FormData>(
    salveazaStripeDonatiiAction.bind(null, orgSlug),
    { error: null, ok: false },
  );
  const [deconectare, startDeconectare] = useTransition();
  const [copiat, setCopiat] = useState(false);

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
      <h2 className="font-display text-lg font-bold text-ink">Plăți donații (Stripe)</h2>
      <p className="mt-1 text-sm text-muted">
        Donațiile de pe paginile tale de campanie se încasează direct în <strong>contul tău Stripe</strong>, nu prin
        platformă. Ai nevoie de propriul cont pe stripe.com.
      </p>

      <p
        className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${
          pregatit ? "bg-brand-green-soft text-brand-green" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        }`}
      >
        {pregatit
          ? `Conectat · ${status.hint ?? ""}`
          : status.conectat
            ? "Cheia e salvată — mai lipsește secretul webhook-ului"
            : "Neconectat — donațiile online nu funcționează încă"}
      </p>

      {!status.criptareActiva && (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Serverul nu are încă activată criptarea cheilor, deci nu poți salva cheile acum. Contactează administratorul
          platformei.
        </p>
      )}

      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-body">
        <li>
          Creează-ți cont pe <strong>stripe.com</strong> și activează-l (Stripe îți cere datele organizației și contul
          bancar în care primești donațiile).
        </li>
        <li>
          Din Stripe → <em>Developers → API keys</em> copiază <strong>Secret key</strong> (începe cu{" "}
          <code>sk_live_</code>). Dacă preferi o cheie restricționată, dă-i permisiuni: Checkout Sessions (Write),
          Subscriptions (Read), Invoices (Read).
        </li>
        <li>
          Din <em>Developers → Webhooks → Add endpoint</em> pune adresa de mai jos și bifează evenimentele listate. Apoi
          copiază <strong>Signing secret</strong> (începe cu <code>whsec_</code>).
        </li>
      </ol>

      <div className="mt-4">
        <p className="text-xs font-semibold text-ink">Adresa webhook-ului (Endpoint URL)</p>
        <div className="mt-1 flex items-center gap-2">
          <code className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-line bg-panel-2 px-3 py-2 text-xs text-body">
            {webhookUrl}
          </code>
          <button
            type="button"
            onClick={copiaza}
            className="shrink-0 rounded-lg border border-line px-3 py-2 text-xs font-medium text-ink transition hover:bg-panel-2"
          >
            {copiat ? "Copiat" : "Copiază"}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">Evenimente de bifat: {EVENIMENTE.join(", ")}.</p>
      </div>

      <form action={formAction} className="mt-5 space-y-4">
        <label className="block text-sm font-medium text-ink">
          Cheia secretă Stripe
          <input
            name="cheieSecreta"
            type="password"
            autoComplete="off"
            placeholder={status.conectat ? "Lasă gol ca să păstrezi cheia salvată" : "sk_live_…"}
            className={input}
          />
        </label>
        <label className="block text-sm font-medium text-ink">
          Secretul webhook-ului (Signing secret)
          <input
            name="secretWebhook"
            type="password"
            autoComplete="off"
            placeholder={status.areWebhook ? "Lasă gol ca să păstrezi secretul salvat" : "whsec_…"}
            className={input}
          />
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.ok && !state.error && <p className="text-sm text-brand-green">Salvat.</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={pending || !status.criptareActiva}
            className="rounded-lg bg-brand-green px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-50"
          >
            {pending ? "Se salvează…" : "Salvează"}
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
              Deconectează Stripe
            </button>
          )}
        </div>
        <p className="text-xs text-muted">
          Cheile sunt criptate înainte de salvare și nu mai sunt afișate niciodată. Le poți schimba oricând.
        </p>
      </form>
    </section>
  );
}
