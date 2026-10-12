"use client";

import { useState, useTransition } from "react";

import type { LinkPortal } from "@/lib/donator-portal";
import { SUMA_MAX, SUMA_MIN, type DescriereAbonament, type Operatie } from "@/lib/donator-portal-ops";
import type { Locale } from "@/lib/i18n/config";
import { PORTAL_DONATOR_DICT } from "@/lib/i18n/dictionaries/portal-donator";

import { cardAction, operatieAction } from "../actions";

export type ElementPortal = { subId: string; campanie: string; descriere: DescriereAbonament };

const BUTON = "rounded-lg border border-line bg-panel px-4 py-2 text-[14px] font-semibold text-ink transition hover:border-brand-blue hover:text-brand-blue disabled:opacity-60";

function Abonament({ orgSlug, link, element, locale }: { orgSlug: string; link: LinkPortal; element: ElementPortal; locale: Locale }) {
  const t = PORTAL_DONATOR_DICT[locale].gestioneaza;
  const [d, setD] = useState(element.descriere);
  const [mesaj, setMesaj] = useState<{ ok: boolean; text: string } | null>(null);
  const [schimba, setSchimba] = useState(false);
  const [confirmaOprire, setConfirmaOprire] = useState(false);
  const [suma, setSuma] = useState(String(element.descriere.suma));
  const [pending, startTransition] = useTransition();
  const loc = locale === "ro" ? "ro-RO" : "en-US";
  const lei = d.moneda === "ron" ? (locale === "ro" ? "lei" : "RON") : d.moneda.toUpperCase();

  function ruleaza(op: Operatie) {
    setMesaj(null);
    startTransition(async () => {
      const r = await operatieAction(orgSlug, link, element.subId, op);
      if (r.ok) {
        setD(r.dupa);
        setSchimba(false);
        setConfirmaOprire(false);
        setMesaj({ ok: true, text: op.tip === "suma" ? t.mesaje.suma(r.dupa.suma) : t.mesaje[op.tip === "opreste" ? "opreste" : op.tip === "pauza" ? "pauza" : "reia"] });
        return;
      }
      const text = r.cod === "oprit" ? t.mesaje.oprit : r.cod === "stare" ? t.mesaje.stare : r.cod === "limita" ? t.mesaje.limita : r.cod === "suma_invalida" ? t.sumaMinMax(SUMA_MIN, SUMA_MAX) : t.mesaje.eroare;
      setMesaj({ ok: false, text });
    });
  }

  function card() {
    setMesaj(null);
    startTransition(async () => {
      const r = await cardAction(orgSlug, link, element.subId);
      if (r.url) window.location.href = r.url;
      else setMesaj({ ok: false, text: t.mesaje.card });
    });
  }

  const eticheta = t.stari[d.stare];
  const culoare = d.stare === "activ" ? "bg-brand-green-soft text-brand-green" : d.stare === "pauza" ? "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" : "bg-panel-2 text-muted";

  return (
    <article className="rounded-2xl border border-line bg-panel p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[18px] leading-snug font-bold text-ink">{element.campanie}</h2>
          <p className="mt-1 text-[22px] font-extrabold text-ink">
            {d.suma.toLocaleString(loc)} {lei} <span className="text-[14px] font-medium text-muted">{t.pePerLuna}</span>
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${culoare}`}>{eticheta}</span>
      </div>
      {d.urmatoarea && <p className="mt-2 text-[14px] text-muted">{t.urmatoarea(new Date(d.urmatoarea).toLocaleDateString(loc, { day: "numeric", month: "long", year: "numeric" }))}</p>}
      {d.stare === "pauza" && <p className="mt-2 text-[14px] text-muted">{t.inPauza}</p>}

      {mesaj && (
        <p role="status" className={`mt-4 rounded-lg px-4 py-3 text-[14px] leading-relaxed ${mesaj.ok ? "bg-brand-green-soft text-ink" : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200"}`}>
          {mesaj.text}
        </p>
      )}

      {d.stare !== "oprit" && (
        <div className="mt-5 flex flex-wrap gap-2.5">
          {d.moneda === "ron" && !schimba && (
            <button type="button" disabled={pending} onClick={() => { setSchimba(true); setSuma(String(d.suma)); setConfirmaOprire(false); }} className={BUTON}>
              {t.schimbaSuma}
            </button>
          )}
          {d.stare === "activ" ? (
            <button type="button" disabled={pending} onClick={() => ruleaza({ tip: "pauza" })} className={BUTON}>
              {t.pauza}
            </button>
          ) : (
            <button type="button" disabled={pending} onClick={() => ruleaza({ tip: "reia" })} className={BUTON}>
              {t.reia}
            </button>
          )}
          <button type="button" disabled={pending} onClick={card} className={BUTON}>
            {t.actualizeazaCard}
          </button>
          {!confirmaOprire && (
            <button type="button" disabled={pending} onClick={() => { setConfirmaOprire(true); setSchimba(false); }} className={`${BUTON} text-red-700 hover:border-red-400 hover:text-red-700 dark:text-red-300`}>
              {t.opreste}
            </button>
          )}
        </div>
      )}
      {d.stare !== "oprit" && d.moneda !== "ron" && <p className="mt-3 text-[13px] text-muted">{t.sumaEuro}</p>}

      {schimba && (
        <form
          className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-panel-2 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            ruleaza({ tip: "suma", suma: Number(suma) });
          }}
        >
          <label className="text-[13.5px] font-medium text-ink">
            {t.sumaNoua}
            <input
              type="number"
              inputMode="numeric"
              min={SUMA_MIN}
              max={SUMA_MAX}
              step={1}
              required
              value={suma}
              onChange={(e) => setSuma(e.target.value)}
              className="mt-1 block w-36 rounded-lg border border-line bg-panel px-3 py-2 text-[15px] text-ink focus:border-brand-blue focus:outline-none"
            />
          </label>
          <button type="submit" disabled={pending} className="rounded-lg bg-brand-green px-5 py-2.5 text-[14px] font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-60">
            {t.salveaza}
          </button>
          <button type="button" onClick={() => setSchimba(false)} className="px-2 py-2.5 text-[14px] font-medium text-muted hover:text-ink">
            {t.renunta}
          </button>
        </form>
      )}

      {confirmaOprire && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40" role="alertdialog" aria-label={t.opreste}>
          <p className="text-[14px] leading-relaxed text-ink">{t.confirmaOprire}</p>
          <div className="mt-3 flex gap-2.5">
            <button type="button" disabled={pending} onClick={() => ruleaza({ tip: "opreste" })} className="rounded-lg bg-red-600 px-4 py-2 text-[14px] font-bold text-white transition hover:bg-red-700 disabled:opacity-60">
              {t.daOprest}
            </button>
            <button type="button" disabled={pending} onClick={() => setConfirmaOprire(false)} className="px-2 py-2 text-[14px] font-medium text-muted hover:text-ink">
              {t.renunta}
            </button>
          </div>
        </div>
      )}
    </article>
  );
}

export function PortalClient({ orgSlug, link, elemente, locale }: { orgSlug: string; link: LinkPortal; elemente: ElementPortal[]; locale: Locale }) {
  return (
    <div className="mt-6 space-y-4">
      {elemente.map((el) => (
        <Abonament key={el.subId} orgSlug={orgSlug} link={link} element={el} locale={locale} />
      ))}
    </div>
  );
}
