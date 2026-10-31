"use client";

import { useEffect, useState, useTransition } from "react";

import { SETARI_PROSPECTARE_UI_DICT } from "@/lib/i18n/dictionaries/setari-prospectare-ui";

import { useLocale } from "../crm/lib/locale-context";
import { getAdresaWebhookWaalaxy, regenereazaAdresaWebhookWaalaxy } from "./waalaxy-webhook-actions";

// Setări → Prospectare → Waalaxy: adresa webhook-ului prin care Waalaxy ne anunță acceptările de invitație și răspunsurile (API-ul lor nu le expune).
export function WaalaxyWebhookCard({ orgSlug }: { orgSlug: string }) {
  const d = SETARI_PROSPECTARE_UI_DICT[useLocale()].webhook;
  const [adresa, setAdresa] = useState<string | null | undefined>(undefined);
  const [pending, start] = useTransition();
  const [confirma, setConfirma] = useState(false);
  const [copiat, setCopiat] = useState(false);
  const [eroare, setEroare] = useState<string | null>(null);

  useEffect(() => {
    let activ = true;
    getAdresaWebhookWaalaxy(orgSlug)
      .then((r) => activ && setAdresa(r.adresa))
      .catch(() => activ && setAdresa(null));
    return () => {
      activ = false;
    };
  }, [orgSlug]);

  const regenereaza = () =>
    start(async () => {
      setEroare(null);
      try {
        setAdresa((await regenereazaAdresaWebhookWaalaxy(orgSlug)).adresa);
        setConfirma(false);
      } catch {
        setEroare(d.eroare);
      }
    });

  return (
    <div className="mt-4 rounded-md border border-line bg-panel-2 p-4 text-xs leading-relaxed text-muted">
      <p className="text-sm font-semibold text-ink">{d.titlu}</p>
      <p className="mt-1">{d.intro}</p>
      {adresa === undefined ? (
        <p className="mt-2">{d.seIncarca}</p>
      ) : adresa ? (
        <>
          <p className="mt-2 font-medium text-ink">{d.adresaTa}</p>
          <code className="mt-1 block rounded bg-panel px-2 py-2 break-all text-ink">{adresa}</code>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(adresa);
                  setCopiat(true);
                  setTimeout(() => setCopiat(false), 2000);
                } catch {
                  setCopiat(false);
                }
              }}
              className="h-9 rounded-md border border-line px-3 text-xs font-medium text-ink hover:bg-panel"
            >
              {copiat ? d.copiat : d.copiaza}
            </button>
            {confirma ? (
              <>
                <button type="button" disabled={pending} onClick={regenereaza} className="h-9 rounded-md bg-red-700 px-3 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50">
                  {d.daRegenereaza}
                </button>
                <button type="button" onClick={() => setConfirma(false)} className="h-9 rounded-md border border-line px-3 text-xs font-medium text-ink hover:bg-panel">
                  {d.renunta}
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirma(true)} className="h-9 rounded-md border border-line px-3 text-xs font-medium text-ink hover:bg-panel">
                {d.regenereaza}
              </button>
            )}
          </div>
        </>
      ) : (
        <button type="button" disabled={pending} onClick={regenereaza} className="mt-2 h-9 rounded-md bg-brand-blue px-3 text-xs font-semibold text-white disabled:opacity-50">
          {d.genereaza}
        </button>
      )}
      {eroare && (
        <p role="alert" className="mt-2 text-red-700">
          {eroare}
        </p>
      )}
      <ol className="mt-3 list-decimal space-y-1 pl-5">
        <li>{d.pas1}</li>
        <li>{d.pas2}</li>
        <li>{d.pas3}</li>
      </ol>
      <p className="mt-2">{d.nota}</p>
    </div>
  );
}
