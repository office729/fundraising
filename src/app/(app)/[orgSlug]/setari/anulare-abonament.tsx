"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { Locale } from "@/lib/i18n/config";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";

import { anuleazaAbonamentulAction, reiaAbonamentulAction, type StatusReinnoireAutomata } from "./netopia-card-actions";

// „Anulează abonamentul": vizibil oricărei organizații cu abonament activ, indiferent dacă are card salvat (secțiunea de reînnoire
// automată apare doar cu card). Confirmare în pagină (nu window.confirm).
export function AnulareAbonament({ orgSlug, status, locale }: { orgSlug: string; status: StatusReinnoireAutomata; locale: Locale }) {
  const dict = SETARI_ECHIPA_DICT[locale].orgSetari.anulareAbonament;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirma, setConfirma] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);

  const data = status.valabilPanaLa ? new Date(status.valabilPanaLa).toLocaleDateString(locale === "en" ? "en-GB" : "ro-RO", { day: "2-digit", month: "long", year: "numeric" }) : null;

  function ruleaza(actiune: (slug: string) => Promise<void>) {
    setEroare(null);
    startTransition(async () => {
      try {
        await actiune(orgSlug);
        setConfirma(false);
        router.refresh();
      } catch {
        setEroare(dict.eroare);
      }
    });
  }

  return (
    <section id="anulare-abonament" className="mt-6 border-t border-line pt-5">
      <h3 className="font-display text-sm font-bold text-ink">{dict.title}</h3>

      {status.anulat ? (
        <>
          <p className="mt-1.5 text-sm text-muted">{dict.anulat(data)}</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => ruleaza(reiaAbonamentulAction)}
            className="mt-3 rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-panel-2 disabled:opacity-50"
          >
            {pending ? dict.seSalveaza : dict.reia}
          </button>
        </>
      ) : confirma ? (
        <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-sm text-amber-950" role="alertdialog" aria-label={dict.confirmaTitlu}>
          <p className="font-semibold">{dict.confirmaTitlu}</p>
          <p className="mt-1">{dict.confirmaText(data)}</p>
          <div className="mt-3 flex flex-wrap gap-2.5">
            <button
              type="button"
              disabled={pending}
              onClick={() => ruleaza(anuleazaAbonamentulAction)}
              className="rounded-lg bg-red-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {pending ? dict.seSalveaza : dict.confirma}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirma(false)}
              className="rounded-lg border border-amber-400 px-3.5 py-2 text-sm font-medium text-amber-950 transition hover:bg-amber-100 disabled:opacity-50"
            >
              {dict.renunta}
            </button>
          </div>
        </div>
      ) : (
        <>
          <p className="mt-1.5 text-sm text-muted">{dict.descriere(data)}</p>
          <button
            type="button"
            onClick={() => setConfirma(true)}
            className="mt-3 rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-muted transition hover:border-red-300 hover:text-red-600"
          >
            {dict.anuleaza}
          </button>
        </>
      )}

      {eroare && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {eroare}
        </p>
      )}
    </section>
  );
}
