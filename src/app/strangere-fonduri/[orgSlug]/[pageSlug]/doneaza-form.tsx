"use client";

import Link from "next/link";
import { useActionState, useRef, useState, type FormEvent } from "react";

import type { Locale } from "@/lib/i18n/config";
import { DONATION_DICT } from "@/lib/i18n/dictionaries/donation";

import { doneazaAction, type DoneazaState } from "./actions";
import { ExpressCheckoutPanel } from "./express-checkout";
import { creeazaIntentPaypalAction, creeazaIntentRevolutAction } from "./express-checkout-actions";

const INITIAL: DoneazaState = { error: null };
const SUME_RAPIDE = [25, 50, 100, 250];

export function DoneazaForm({
  orgSlug,
  pageSlug,
  locale,
  publishableKey,
  metoda,
  cursEur,
}: {
  orgSlug: string;
  pageSlug: string;
  titlu: string;
  locale: Locale;
  publishableKey: string | null;
  // "revolut": formular dedicat (ca pe fundatianektarios.ro) — donație unică, fără
  // portofele; la trimitere clientul e dus la autentificarea Revolut.
  // "gpay" / "apay": modal dedicat portofelului — doar suma și butonul Stripe al
  // portofelului (numele/emailul vin din portofel). Fără metodă: formularul obișnuit
  // (plata cu cardul, pe pagina găzduită de Stripe).
  metoda?: "revolut" | "gpay" | "apay" | "paypal";
  // Curs EUR→RON, doar pentru afișarea echivalentului în modalul PayPal.
  cursEur?: number | null;
}) {
  const action = doneazaAction.bind(null, orgSlug, pageSlug);
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const [suma, setSuma] = useState(50);
  const [recurenta, setRecurenta] = useState(false);
  const t = DONATION_DICT[locale].donateForm;
  const formRef = useRef<HTMLFormElement>(null);
  const revolut = metoda === "revolut";
  const paypal = metoda === "paypal";
  // Metode cu redirect (formular dedicat, donație unică): Revolut Pay și PayPal.
  const redirect = revolut || paypal;
  const [sumaEur, setSumaEur] = useState(10);
  const portofel = metoda === "gpay" || metoda === "apay";
  const [revolutPending, setRevolutPending] = useState(false);
  const [revolutEroare, setRevolutEroare] = useState<string | null>(null);

  async function trimiteRevolut(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    if (revolutPending) return;
    setRevolutPending(true);
    setRevolutEroare(null);
    try {
      const actiune = paypal ? creeazaIntentPaypalAction : creeazaIntentRevolutAction;
      const rezultat = await actiune(orgSlug, pageSlug, new FormData(ev.currentTarget));
      if (!rezultat.ok) {
        setRevolutEroare(rezultat.error);
        return;
      }
      if (!rezultat.redirectUrl) {
        setRevolutEroare(t.plataExpressEsuata);
        return;
      }
      // Autentificarea la Revolut / PayPal; la întoarcere Stripe adaugă payment_intent și
      // redirect_status (vezi multumim/page.tsx), iar webhook-ul marchează donația.
      window.location.href = rezultat.redirectUrl;
    } catch {
      setRevolutEroare(t.plataExpressEsuata);
    } finally {
      setRevolutPending(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={redirect ? undefined : formAction}
      onSubmit={redirect ? trimiteRevolut : undefined}
      className="mt-4 flex flex-col gap-3"
    >
      {/* Honeypot — invizibil pentru oameni. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

      <div
        role="group"
        aria-label={t.frecventaLabel}
        className="inline-flex self-start overflow-hidden rounded-lg border border-line text-sm font-bold"
      >
        <button
          type="button"
          aria-pressed={!recurenta}
          onClick={() => setRecurenta(false)}
          className={`px-4 py-2 transition ${!recurenta ? "bg-brand-green text-white" : "bg-panel text-ink"}`}
        >
          {t.oSingurataData}
        </button>
        <button
          type="button"
          aria-pressed={recurenta}
          onClick={() => setRecurenta(true)}
          className={`px-4 py-2 transition ${recurenta ? "bg-brand-green text-white" : "bg-panel text-ink"}`}
        >
          {t.lunar}
        </button>
      </div>
      <input type="hidden" name="recurenta" value={recurenta ? "1" : ""} />

      {paypal ? (
        <>
          <div role="group" aria-label={t.sumeRapideLabel} className="flex flex-wrap gap-2">
            {[2, 5, 10, 50].map((e) => (
              <button
                key={e}
                type="button"
                aria-pressed={sumaEur === e}
                onClick={() => setSumaEur(e)}
                className={`rounded-full border px-4 py-1.5 text-sm font-bold transition ${
                  sumaEur === e ? "border-brand-green bg-brand-green-soft text-brand-green" : "border-line text-ink hover:border-brand-blue"
                }`}
              >
                {e} EUR
              </button>
            ))}
          </div>
          <label className="text-sm font-medium text-ink">
            {t.sumaEur}
            <input
              type="number"
              name="sumaEur"
              min={1}
              max={10000}
              step="any"
              value={sumaEur}
              onChange={(e) => setSumaEur(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink"
            />
          </label>
          <p className="text-[12px] text-muted-2">
            {t.paypalInfo}
            {cursEur && Number.isFinite(sumaEur) && sumaEur > 0 ? ` ${t.echivalentLei(Math.round(sumaEur * cursEur))}${recurenta ? t.pePeLuna : ""}` : ""}
          </p>
        </>
      ) : (
        <>
      <div role="group" aria-label={t.sumeRapideLabel} className="flex flex-wrap gap-2">
        {SUME_RAPIDE.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={suma === s}
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
        {t.sumaLei}
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
        </>
      )}

      {portofel && (
        <ExpressCheckoutPanel
          orgSlug={orgSlug}
          pageSlug={pageSlug}
          publishableKey={publishableKey}
          suma={suma}
          recurenta={recurenta}
          formRef={formRef}
          locale={locale}
          portofel={metoda === "gpay" ? "google" : "apple"}
        />
      )}

      {!portofel && (
        <>
      <label className="text-sm font-medium text-ink">
        {t.numeleTau}
        <input name="numeDonator" required className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink" />
      </label>
      <label className="text-sm font-medium text-ink">
        {t.email}
        <input type="email" name="emailDonator" required className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink" />
      </label>
      <label className="text-sm font-medium text-ink">
        {t.telefonOptional}
        <input type="tel" name="telefonDonator" className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink" />
      </label>
      <label className="text-sm font-medium text-ink">
        {t.mesajOptional}
        <textarea name="mesaj" rows={2} className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink" />
      </label>
      <label className="flex items-center gap-2 text-sm text-body">
        <input type="checkbox" name="anonim" className="h-4 w-4 rounded border-line" />
        {t.nuAfisaNume}
      </label>

      <div className="mt-1 flex flex-col gap-2 border-t border-line pt-3">
        <label className="flex items-start gap-2 text-[13px] text-body">
          <input type="checkbox" name="consimtamantGdpr" required className="mt-0.5 h-4 w-4 rounded border-line" />
          <span>
            {t.acordGdprPre}{" "}
            <Link href="/gdpr" target="_blank" className="font-medium text-brand-green hover:underline">
              {t.acordGdprLink}
            </Link>
          </span>
        </label>
        <label className="flex items-start gap-2 text-[13px] text-body">
          <input type="checkbox" name="consimtamantTermeni" required className="mt-0.5 h-4 w-4 rounded border-line" />
          <span>
            {t.acordTermeniPre}{" "}
            <Link href="/termeni" target="_blank" className="font-medium text-brand-green hover:underline">
              {t.acordTermeniLink}
            </Link>
          </span>
        </label>
        <label className="flex items-start gap-2 text-[13px] text-body">
          <input type="checkbox" name="consimtamantWhatsapp" className="mt-0.5 h-4 w-4 rounded border-line" />
          <span>{t.acordWhatsapp}</span>
        </label>
      </div>

      {(redirect ? revolutEroare : state.error) && (
        <p className="text-sm text-red-600">{redirect ? revolutEroare : state.error}</p>
      )}

      <button
        type="submit"
        disabled={redirect ? revolutPending : pending}
        className="mt-1 rounded-md bg-brand-green px-4 py-3 text-center font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-60"
      >
        {(redirect ? revolutPending : pending)
          ? t.sePregateste
          : paypal
            ? `${t.donezaVerb} ${sumaEur} ${recurenta ? t.donezaSufixPaypalLuna : t.donezaSufixPaypal}`
            : revolut
              ? `${t.donezaVerb} ${suma} ${recurenta ? t.donezaSufixRevolutLuna : t.donezaSufixRevolut}`
              : recurenta
                ? `${t.donezaVerb} ${suma} ${t.donezaLunaSufix}`
                : `${t.donezaVerb} ${suma} ${t.donezaSufix}`}
      </button>
      <p className="text-center text-[11px] text-muted-2">{t.notaPlataSecurizata}</p>
        </>
      )}
    </form>
  );
}
