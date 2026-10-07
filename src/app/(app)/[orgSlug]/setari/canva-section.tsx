"use client";

import { useState, useTransition } from "react";

import type { Locale } from "@/lib/i18n/config";

import { deconecteazaCanvaAction, listeazaSabloaneCanvaAction, salveazaSablonCanvaAction, type StatusCanva } from "./canva-actions";

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

export function CanvaSection({
  orgSlug,
  locale,
  status,
  feedback,
}: {
  orgSlug: string;
  locale: Locale;
  status: StatusCanva;
  feedback?: string;
}) {
  const ro = locale !== "en";
  const [conectat, setConectat] = useState(status.conectat);
  const [brandTemplateId, setBrandTemplateId] = useState(status.brandTemplateId);
  const [brandTemplateNume, setBrandTemplateNume] = useState(status.brandTemplateNume);
  const [sabloane, setSabloane] = useState<{ id: string; titlu: string }[] | null>(null);
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const onListeazaSabloane = () => {
    setEroare(null);
    start(async () => {
      try {
        setSabloane(await listeazaSabloaneCanvaAction(orgSlug));
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  const onSalveazaSablon = (id: string, titlu: string) => {
    start(async () => {
      try {
        await salveazaSablonCanvaAction(orgSlug, id, titlu);
        setBrandTemplateId(id);
        setBrandTemplateNume(titlu);
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  const onDeconecteaza = () => {
    start(async () => {
      try {
        await deconecteazaCanvaAction(orgSlug);
        setConectat(false);
        setBrandTemplateId(null);
        setBrandTemplateNume(null);
        setSabloane(null);
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  return (
    <section id="canva" className="mt-8 scroll-mt-4 border-t border-line pt-6">
      <div className="flex items-center gap-2.5">
        <h2 className="font-display text-lg font-bold text-ink">{ro ? "Integrare Canva" : "Canva integration"}</h2>
        <Pastila ok={conectat} text={conectat ? (ro ? "Conectat" : "Connected") : ro ? "Neconectat" : "Not connected"} />
      </div>
      <p className="mt-1 text-sm text-muted">
        {ro
          ? "Folosită de instrumentul „Raport de activitate companii” ca să trimită raportul pe un șablon Canva ales de tine."
          : "Used by the “Company activity report” tool to send the report to a Canva template of your choice."}
      </p>

      {feedback === "eroare" && (
        <p className="mt-3 text-sm text-red-600">{ro ? "Conectarea la Canva a eșuat. Încearcă din nou." : "Connecting to Canva failed. Try again."}</p>
      )}
      {feedback === "neconfigurat" && (
        <p className="mt-3 text-sm text-amber-700">
          {ro ? "Integrarea Canva nu e configurată încă pe platformă (lipsesc cheile)." : "The Canva integration isn't configured on the platform yet (missing keys)."}
        </p>
      )}
      {feedback === "ok" && <p className="mt-3 text-sm text-brand-green">{ro ? "Cont Canva conectat cu succes." : "Canva account connected."}</p>}

      {!status.configurat ? (
        <p className="mt-3 text-sm text-muted-2">
          {ro ? "Momentan indisponibil — lipsesc cheile de integrare Canva." : "Currently unavailable — Canva integration keys are missing."}
        </p>
      ) : !conectat ? (
        <a
          href={`/api/canva/authorize/${orgSlug}`}
          className="mt-3 inline-flex rounded-lg border border-brand-blue px-3.5 py-2 text-sm font-medium text-brand-blue transition hover:bg-brand-blue-soft"
        >
          {ro ? "Conectează Canva" : "Connect Canva"}
        </a>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-ink">
            {ro ? "Șablon ales: " : "Selected template: "}
            <span className="font-medium">{brandTemplateNume ?? (ro ? "niciunul încă" : "none yet")}</span>
          </p>

          {!sabloane ? (
            <button
              type="button"
              onClick={onListeazaSabloane}
              disabled={pending}
              className="rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink transition hover:bg-panel disabled:opacity-50"
            >
              {ro ? "Alege șablon din Canva" : "Choose a Canva template"}
            </button>
          ) : sabloane.length === 0 ? (
            <p className="text-sm text-muted-2">{ro ? "Niciun Brand Template găsit în contul Canva conectat." : "No Brand Templates found in the connected Canva account."}</p>
          ) : (
            <ul className="max-h-64 divide-y divide-line overflow-y-auto rounded-lg border border-line">
              {sabloane.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
                  <span className="text-ink">{s.titlu}</span>
                  <button
                    type="button"
                    onClick={() => onSalveazaSablon(s.id, s.titlu)}
                    disabled={pending || s.id === brandTemplateId}
                    className="shrink-0 rounded-lg border border-line px-2.5 py-1 text-xs font-medium text-ink transition hover:bg-panel disabled:opacity-50"
                  >
                    {s.id === brandTemplateId ? (ro ? "Ales" : "Selected") : ro ? "Alege" : "Choose"}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button type="button" onClick={onDeconecteaza} disabled={pending} className="block text-sm font-medium text-red-600 hover:underline disabled:opacity-50">
            {ro ? "Deconectează Canva" : "Disconnect Canva"}
          </button>
        </div>
      )}

      {eroare && <p className="mt-2 text-sm text-red-600">{eroare}</p>}
    </section>
  );
}
