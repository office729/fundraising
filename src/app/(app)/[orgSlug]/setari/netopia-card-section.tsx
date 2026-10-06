"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { Locale } from "@/lib/i18n/config";
import { SETARI_ECHIPA_DICT } from "@/lib/i18n/dictionaries/setari-echipa";

import { activeazaReinnoireAutomataAction, dezactiveazaReinnoireAutomataAction, eliminaCardSalvatAction, type StatusReinnoireAutomata } from "./netopia-card-actions";

// Afișată doar când există (sau a existat) un card salvat pentru reînnoire
// automată — o organizație care n-a plătit încă niciodată prin Netopia, sau al
// cărei card nu a putut fi salvat (bancă/rețea fără suport), nu vede nimic aici;
// pentru ea, reînnoirea rămâne descrisă doar ca disclosure înainte de plată
// (vezi package-picker.tsx).
export function NetopiaCardSection({ orgSlug, status, locale }: { orgSlug: string; status: StatusReinnoireAutomata; locale: Locale }) {
  const dict = SETARI_ECHIPA_DICT[locale].orgSetari.reinnoireAutomata;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [eroare, setEroare] = useState<string | null>(null);

  if (!status.cardSalvat) return null;

  // Netopia nu returnează mereu ultimele cifre (de exemplu în sandbox): fără ele, propoziția rămâne naturală, nu „•••• ????".
  const card = status.cardMasked ?? (locale === "ro" ? "salvat" : "on file");

  return (
    <section className="mt-6 border-t border-line pt-5">
      <div className="flex items-center gap-2">
        <h3 className="font-display text-sm font-bold text-ink">{dict.title}</h3>
        <span
          className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            status.activa ? "bg-brand-green-soft text-brand-green" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
          }`}
        >
          {status.activa ? "✓" : "○"}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-muted">{status.activa ? dict.activaCu(card) : dict.opritaCuCard(card)}</p>
      {status.expiraLuna && status.expiraAn && <p className="text-xs text-muted-2">{dict.expira(status.expiraLuna, status.expiraAn)}</p>}
      {status.incercariEsuate > 0 && <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">{dict.incercariEsuate(status.incercariEsuate)}</p>}

      {eroare && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {eroare}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2.5">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setEroare(null);
            startTransition(async () => {
              try {
                if (status.activa) {
                  await dezactiveazaReinnoireAutomataAction(orgSlug);
                } else {
                  const r = await activeazaReinnoireAutomataAction(orgSlug);
                  if (!r.ok) {
                    setEroare(dict.eroare);
                    return;
                  }
                }
                router.refresh();
              } catch {
                setEroare(dict.eroare);
              }
            });
          }}
          className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-panel-2 disabled:opacity-50"
        >
          {status.activa ? dict.dezactiveaza : dict.activeaza}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(dict.confirmaEliminare)) return;
            setEroare(null);
            startTransition(async () => {
              try {
                await eliminaCardSalvatAction(orgSlug);
                router.refresh();
              } catch {
                setEroare(dict.eroare);
              }
            });
          }}
          className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-muted transition hover:text-red-600 disabled:opacity-50"
        >
          {dict.eliminaCard}
        </button>
      </div>
    </section>
  );
}
