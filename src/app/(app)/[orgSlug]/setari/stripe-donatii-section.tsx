"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";

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
  "w-full rounded-lg border border-line bg-panel px-3 py-2 font-mono text-sm text-ink placeholder:text-muted-2 focus:border-brand-blue focus:outline-none";

type Dict = (typeof SETARI_ECHIPA_DICT)["ro"]["orgSetari"]["stripeDonatii"];

function Pastila({ ok, text }: { ok: boolean; text: string }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        ok ? "bg-brand-green-soft text-brand-green" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
      }`}
    >
      {text}
    </span>
  );
}

// Un pas = o carte cu titlu, starea lui (salvat / nu) și propriul formular:
// se salvează doar câmpul din carte, cu confirmare chiar sub buton.
function CardPas({
  orgSlug,
  dict,
  numar,
  titlu,
  descriere,
  optional,
  salvat,
  detaliuSalvat,
  camp,
  placeholderNou,
  placeholderInlocuire,
  tip,
  blocat,
  inainte,
  dupa,
}: {
  orgSlug: string;
  dict: Dict;
  numar: number;
  titlu: string;
  descriere: string;
  optional?: boolean;
  salvat: boolean;
  detaliuSalvat?: string | null;
  camp: "cheieSecreta" | "secretWebhook" | "cheiePublicabila";
  placeholderNou: string;
  placeholderInlocuire: string;
  tip: "password" | "text";
  blocat?: boolean;
  inainte?: ReactNode;
  dupa?: ReactNode;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [editare, setEditare] = useState(false);
  const [state, formAction, pending] = useActionState<StripeDonatiiState, FormData>(
    salveazaStripeDonatiiAction.bind(null, orgSlug),
    { error: null, ok: false },
  );

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setEditare(false);
      router.refresh();
    }
  }, [state, router]);

  const arataCamp = !salvat || editare;
  return (
    <div className={`rounded-xl border-2 p-4 ${salvat ? "border-brand-green/60" : "border-line"} bg-panel`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">{dict.card.pas(numar)}</span>
          {optional && <span className="text-xs text-muted">({dict.card.optional})</span>}
        </div>
        <Pastila ok={salvat} text={salvat ? dict.card.conectat : dict.card.lipseste} />
      </div>
      <h3 className="mt-1 text-base font-bold text-ink">{titlu}</h3>
      <p className="mt-1 text-sm text-muted">{descriere}</p>

      {salvat && !editare && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-brand-green-soft px-4 py-3">
          <div className="flex items-center gap-3">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-green text-lg font-bold text-white"
            >
              ✓
            </span>
            <div>
              <p className="text-sm font-bold text-brand-green">{dict.card.conectatMare}</p>
              {detaliuSalvat && <p className="font-mono text-xs text-body">{detaliuSalvat}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEditare(true)}
            className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink transition hover:bg-panel-2"
          >
            {dict.card.schimba}
          </button>
        </div>
      )}

      {inainte}

      {!arataCamp ? null : blocat ? (
        <p className="mt-3 rounded-lg bg-panel-2 px-3 py-2 text-sm text-muted">{dict.card.blocat}</p>
      ) : (
        <form ref={formRef} action={formAction} className="mt-3 space-y-2">
          <input
            name={camp}
            type={tip}
            autoComplete="off"
            aria-label={titlu}
            placeholder={salvat ? placeholderInlocuire : placeholderNou}
            className={input}
          />
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-brand-green px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-50"
            >
              {pending ? dict.seSalveaza : salvat ? dict.card.inlocuieste : dict.card.salveaza}
            </button>
            {salvat && (
              <button type="button" onClick={() => setEditare(false)} className="text-sm text-muted underline">
                {dict.card.anuleaza}
              </button>
            )}
          </div>
          {state.error && (
            <p className="text-sm text-red-600" role="alert">
              {state.error}
            </p>
          )}
        </form>
      )}

      {dupa}
    </div>
  );
}

// Donațiile de pe paginile de campanie ale ONG-ului se încasează în contul lui
// Stripe, nu al platformei. Conectarea are 3 pași (cheie secretă, webhook, cheie
// publicabilă opțională); fiecare card își arată singur dacă e salvat.
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
  const dict = SETARI_ECHIPA_DICT[locale].orgSetari.stripeDonatii as Dict;
  const router = useRouter();
  const [deconectare, startDeconectare] = useTransition();
  const [copiat, setCopiat] = useState(false);
  const [activareDomeniu, startActivareDomeniu] = useTransition();
  const [eroareDomeniu, setEroareDomeniu] = useState<string | null>(null);

  async function copiaza() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiat(true);
      setTimeout(() => setCopiat(false), 2000);
    } catch {
      // clipboard indisponibil — URL-ul rămâne selectabil manual
    }
  }

  const gata = status.conectat && status.areWebhook;
  const ramase = (status.conectat ? 0 : 1) + (status.areWebhook ? 0 : 1);
  const modTest = status.hint ? /_test_/.test(status.hint) : null;
  const pk = status.publishableKey;
  const pkMascat = pk ? `${pk.slice(0, 8)}…${pk.slice(-4)}` : null;

  return (
    <section className="mt-8 border-t border-line pt-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-display text-lg font-bold text-ink">{dict.title}</h2>
        {modTest !== null && (
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${
              modTest ? "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200" : "bg-brand-green-soft text-brand-green"
            }`}
          >
            {modTest ? dict.card.modTest : dict.card.modLive}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">
        {dict.introBefore}
        <strong>{dict.introBold}</strong>
        {dict.introAfter}
      </p>

      <div
        className={`mt-3 rounded-lg px-4 py-3 text-sm font-semibold ${
          gata ? "bg-brand-green-soft text-brand-green" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
        }`}
        role="status"
      >
        {gata ? `✓ ${dict.card.gata}` : dict.card.ramas(ramase)}
      </div>

      {!status.criptareActiva && (
        <p className="mt-3 rounded-lg border border-amber-300 bg-amber-100 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          {dict.criptareInactiva}
        </p>
      )}

      <details className="mt-3 rounded-lg border border-line bg-panel-2 px-4 py-2">
        <summary className="cursor-pointer text-sm font-medium text-ink">{dict.card.unde}</summary>
        <ol className="mt-2 list-decimal space-y-2 pb-2 pl-5 text-sm leading-relaxed text-body">
          {dict.pasi.map((pas, i) => (
            <li key={i}>
              {pas.map((parte, j) =>
                "strong" in parte && parte.strong ? (
                  <strong key={j}>{parte.text}</strong>
                ) : "em" in parte && parte.em ? (
                  <em key={j}>{parte.text}</em>
                ) : "code" in parte && parte.code ? (
                  <code key={j}>{parte.text}</code>
                ) : (
                  <span key={j}>{parte.text}</span>
                ),
              )}
            </li>
          ))}
        </ol>
      </details>

      <div className="mt-4 space-y-4">
        <CardPas
          orgSlug={orgSlug}
          dict={dict}
          numar={1}
          titlu={dict.card.cheie.titlu}
          descriere={dict.card.cheie.desc}
          salvat={status.conectat}
          detaliuSalvat={status.hint}
          camp="cheieSecreta"
          placeholderNou={dict.card.cheie.placeholderNou}
          placeholderInlocuire={dict.card.cheie.placeholderInlocuire}
          tip="password"
          blocat={!status.criptareActiva}
        />

        <CardPas
          orgSlug={orgSlug}
          dict={dict}
          numar={2}
          titlu={dict.card.webhook.titlu}
          descriere={dict.card.webhook.desc}
          salvat={status.areWebhook}
          detaliuSalvat={status.webhookHint}
          camp="secretWebhook"
          placeholderNou={dict.card.webhook.placeholderNou}
          placeholderInlocuire={dict.card.webhook.placeholderInlocuire}
          tip="password"
          blocat={!status.conectat || !status.criptareActiva}
          inainte={
            <div className="mt-3">
              <p className="text-xs font-semibold text-ink">{dict.card.webhook.urlPas}</p>
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
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-muted">{dict.card.evenimente(EVENIMENTE.length)}</summary>
                <p className="mt-1 break-words font-mono text-xs text-body">{EVENIMENTE.join(", ")}</p>
              </details>
              <p className="mt-3 text-xs font-semibold text-ink">{dict.card.webhook.secretPas}</p>
            </div>
          }
        />

        <CardPas
          orgSlug={orgSlug}
          dict={dict}
          numar={3}
          optional
          titlu={dict.card.publicabila.titlu}
          descriere={dict.card.publicabila.desc}
          salvat={Boolean(pk)}
          detaliuSalvat={pkMascat}
          camp="cheiePublicabila"
          placeholderNou={dict.card.publicabila.placeholderNou}
          placeholderInlocuire={dict.card.publicabila.placeholderInlocuire}
          tip="text"
          blocat={!status.conectat || !status.criptareActiva}
          dupa={
            pk && status.conectat ? (
              <div className="mt-4 border-t border-line pt-3">
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
            ) : null
          }
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted">{dict.footNote}</p>
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
    </section>
  );
}
