"use client";

import { useEffect, useState, useTransition } from "react";

import { getAdresaWebhookWaalaxy, regenereazaAdresaWebhookWaalaxy } from "./waalaxy-webhook-actions";

// Setări → Prospectare → Waalaxy: adresa webhook-ului prin care Waalaxy ne anunță acceptările de invitație și răspunsurile (API-ul lor nu le expune).
export function WaalaxyWebhookCard({ orgSlug }: { orgSlug: string }) {
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
        setEroare("Nu am putut genera adresa. Încearcă din nou.");
      }
    });

  return (
    <div className="mt-4 rounded-md border border-line bg-panel-2 p-4 text-xs leading-relaxed text-muted">
      <p className="text-sm font-semibold text-ink">Răspunsurile de pe LinkedIn (webhook)</p>
      <p className="mt-1">
        Waalaxy nu ne lasă să citim răspunsurile prin API, dar ni le poate trimite la o adresă. Cu ea, Alexandrit marchează automat persoanele (invitat, conectat, a răspuns, a refuzat), îți creează o sarcină când cineva
        îți acceptă invitația și oprește orice contact cu cine a refuzat.
      </p>
      {adresa === undefined ? (
        <p className="mt-2">Se încarcă…</p>
      ) : adresa ? (
        <>
          <p className="mt-2 font-medium text-ink">Adresa ta (secretă, nu o da altcuiva):</p>
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
              {copiat ? "Copiat" : "Copiază adresa"}
            </button>
            {confirma ? (
              <>
                <button type="button" disabled={pending} onClick={regenereaza} className="h-9 rounded-md bg-red-700 px-3 text-xs font-semibold text-white hover:bg-red-800 disabled:opacity-50">
                  Da, regenerează (cea veche nu va mai merge)
                </button>
                <button type="button" onClick={() => setConfirma(false)} className="h-9 rounded-md border border-line px-3 text-xs font-medium text-ink hover:bg-panel">
                  Renunță
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirma(true)} className="h-9 rounded-md border border-line px-3 text-xs font-medium text-ink hover:bg-panel">
                Regenerează
              </button>
            )}
          </div>
        </>
      ) : (
        <button type="button" disabled={pending} onClick={regenereaza} className="mt-2 h-9 rounded-md bg-brand-blue px-3 text-xs font-semibold text-white disabled:opacity-50">
          Generează adresa
        </button>
      )}
      {eroare && (
        <p role="alert" className="mt-2 text-red-700">
          {eroare}
        </p>
      )}
      <ol className="mt-3 list-decimal space-y-1 pl-5">
        <li>În Waalaxy: Setări → integrări → CRM Sync (sau Webhook), disponibil pe planurile care îl includ.</li>
        <li>Lipește adresa de mai sus și alege evenimentele „invitație acceptată” și „răspuns”.</li>
        <li>Persoanele se potrivesc cu firmele din CRM după numele firmei sau profilul LinkedIn. Cine nu e potrivit cu nicio firmă nu se păstrează.</li>
      </ol>
      <p className="mt-2">Textul mesajelor nu se păstrează: se folosește o singură dată, ca să se recunoască un refuz (de exemplu „nu mă interesează”, „stop”).</p>
    </div>
  );
}
