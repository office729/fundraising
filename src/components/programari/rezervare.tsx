"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";

import { anuleazaAction, rezervaAction, sloturiAction, zileDisponibileAction } from "@/app/programare/actions";
import { DEFAULT_LOCALE, esteLocaleValid, LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { PROGRAMARE_UI_DICT } from "@/lib/i18n/dictionaries/programare-ui";
import type { TipPublic } from "@/lib/programari/server";
import type { Slot } from "@/lib/programari/sloturi";

type Props = {
  tipuri: TipPublic[];
  cereTelefon: boolean;
  // De unde se programează (hub, consultanta, onboarding, programare): ajunge la echipă, în email.
  sursa: string;
  prefill?: { nume?: string; email?: string; organizatie?: string };
  className?: string;
  // Limba interfeței; dacă lipsește (locurile din panou care nu o primesc), se citește din cookie-ul fa_locale.
  locale?: Locale;
};

// Calendarul e folosit și din panou (fără prop de limbă): cookie-ul simplu fa_locale e aceeași sursă ca getLocale() de pe server.
function citesteLocaleDinCookie(): Locale {
  const m = document.cookie.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${LOCALE_COOKIE}=`));
  const v = m ? decodeURIComponent(m.slice(LOCALE_COOKIE.length + 1)) : "";
  return esteLocaleValid(v) ? v : DEFAULT_LOCALE;
}
export function useLocaleProgramare(prop?: Locale): Locale {
  return useSyncExternalStore(
    () => () => {},
    () => prop ?? citesteLocaleDinCookie(),
    () => prop ?? DEFAULT_LOCALE,
  );
}

const ISO = (an: number, luna: number, zi: number) => `${an}-${String(luna).padStart(2, "0")}-${String(zi).padStart(2, "0")}`;
const dataLunga = (iso: string, numere: string) => new Intl.DateTimeFormat(numere, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
const dataOra = (utc: string, numere: string) => new Intl.DateTimeFormat(numere, { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }).format(new Date(utc));

const camp = "h-11 w-full rounded-lg border border-line bg-white px-3 text-[15px] text-ink placeholder:text-muted/70 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25";

// Calendarul intern de programări: alegi tipul, ziua și ora dintre cele libere, apoi îți lași datele. Nu încarcă niciun serviciu extern și nu setează cookie-uri.
export function Rezervare({ tipuri, cereTelefon, sursa, prefill, className = "", locale: localeProp }: Props) {
  const t = PROGRAMARE_UI_DICT[useLocaleProgramare(localeProp)];
  const LUNI = t.luni;
  const ZILE = t.zileSapt;
  const azi = useMemo(() => new Date(), []);
  const [tipId, setTipId] = useState(tipuri.length === 1 ? tipuri[0]!.id : "");
  const [an, setAn] = useState(azi.getFullYear());
  const [luna, setLuna] = useState(azi.getMonth() + 1);
  // Zilele libere ale lunii alese; 'versiune' forțează reîncărcarea (de exemplu după ce un slot a fost ocupat între timp).
  const [zileIncarcate, setZileIncarcate] = useState<{ cheie: string; zile: string[] } | null>(null);
  const [versiune, setVersiune] = useState(0);
  const [data, setData] = useState("");
  const [sloturi, setSloturi] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [p, setP] = useState({ nume: prefill?.nume ?? "", email: prefill?.email ?? "", telefon: "", organizatie: prefill?.organizatie ?? "", mesaj: "" });
  const [capcana, setCapcana] = useState("");
  const [acord, setAcord] = useState(false);
  const [erori, setErori] = useState<Record<string, string>>({});
  const [eroare, setEroare] = useState("");
  const [gata, setGata] = useState<{ token: string; startLa: string; mesaj: string } | null>(null);
  const [pending, start] = useTransition();

  const tip = tipuri.find((x) => x.id === tipId);

  const cheieZile = `${tipId}|${an}|${luna}|${versiune}`;
  const zile = zileIncarcate?.cheie === cheieZile ? zileIncarcate.zile : null;
  useEffect(() => {
    if (!tipId) return;
    let activ = true;
    zileDisponibileAction(tipId, an, luna).then((z) => activ && setZileIncarcate({ cheie: cheieZile, zile: z }));
    return () => {
      activ = false;
    };
  }, [tipId, an, luna, cheieZile]);

  async function alegeZi(z: string) {
    setData(z);
    setSlot(null);
    setSloturi(null);
    setEroare("");
    setSloturi(await sloturiAction(tipId, z));
  }

  function lunaCuLuna(delta: number) {
    const d = new Date(Date.UTC(an, luna - 1 + delta, 1));
    setAn(d.getUTCFullYear());
    setLuna(d.getUTCMonth() + 1);
    setData("");
    setSloturi(null);
    setSlot(null);
  }

  const grila = useMemo(() => {
    const prima = new Date(Date.UTC(an, luna - 1, 1));
    const decalaj = (prima.getUTCDay() + 6) % 7; // luni = 0
    const nrZile = new Date(Date.UTC(an, luna, 0)).getUTCDate();
    return [...Array(decalaj).fill(null), ...Array.from({ length: nrZile }, (_, i) => i + 1)] as (number | null)[];
  }, [an, luna]);
  const disponibile = useMemo(() => new Set(zile ?? []), [zile]);
  const esteLunaCurenta = an === azi.getFullYear() && luna === azi.getMonth() + 1;

  function trimite(e: React.FormEvent) {
    e.preventDefault();
    if (!slot) return;
    setEroare("");
    setErori({});
    if (!acord) {
      setEroare(t.politicaTrebuieBifata);
      return;
    }
    start(async () => {
      const r = await rezervaAction({ tipId, startUtc: slot.startUtc, persoana: p, capcana, sursa }).catch(() => null);
      if (!r) {
        setEroare(t.nuAmPututTrimite);
        return;
      }
      if (r.ok) {
        setGata({ token: r.token, startLa: r.startLa, mesaj: r.mesaj });
        return;
      }
      setEroare(r.eroare);
      if (r.campuri) setErori(r.campuri);
      if (r.slotOcupat) {
        setSlot(null);
        void alegeZi(data);
        setVersiune((v) => v + 1);
      }
    });
  }

  if (tipuri.length === 0) {
    return (
      <div className={`rounded-2xl border border-line bg-white p-6 text-[15px] text-muted ${className}`}>
        {t.inchis1}<a href="mailto:vlad.placinta@alexandrit.ro" className="font-semibold text-brand-green underline">vlad.placinta@alexandrit.ro</a>{t.inchis2}
      </div>
    );
  }

  if (gata) {
    return (
      <div className={`rounded-2xl border border-line bg-white p-6 sm:p-8 ${className}`} role="status">
        <p className="text-sm font-bold tracking-wide text-brand-green uppercase">{t.confirmata}</p>
        <h3 className="font-display mt-1 text-2xl font-bold text-ink">{tip?.titlu}</h3>
        <p className="mt-2 text-[16px] text-ink first-letter:uppercase">{dataOra(gata.startLa, t.numere)}</p>
        <p className="text-sm text-muted">{t.oraRomaniei} · {t.minute(tip?.durataMin ?? 0)}{tip?.locatie ? ` · ${tip.locatie}` : ""}</p>
        <p className="mt-4 text-[15px] text-body">{gata.mesaj}</p>
        <p className="mt-2 text-sm text-muted">{t.confirmareTrimisa(p.email)}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={`/programare/${gata.token}/ics`} className="inline-flex min-h-11 items-center rounded-lg bg-brand-green px-5 text-sm font-bold text-white hover:bg-brand-green-hover">
            {t.adaugaCalendar}
          </a>
          <Link href={`/programare/${gata.token}`} className="inline-flex min-h-11 items-center rounded-lg border border-line px-5 text-sm font-semibold text-ink hover:bg-panel-2">
            {t.anuleazaSauMuta}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-line bg-white p-5 sm:p-7 ${className}`}>
      {tipuri.length > 1 && (
        <fieldset className="mb-6">
          <legend className="mb-2 text-sm font-semibold text-ink">{t.tipIntrebare}</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {tipuri.map((x) => (
              <button
                key={x.id}
                type="button"
                aria-pressed={x.id === tipId}
                onClick={() => {
                  setTipId(x.id);
                  setData("");
                  setSloturi(null);
                  setSlot(null);
                }}
                className={`rounded-xl border p-3.5 text-left transition ${x.id === tipId ? "border-brand-green bg-brand-green-soft" : "border-line bg-white hover:bg-panel-2"}`}
              >
                <span className="block text-[15px] font-bold text-ink">{x.titlu}</span>
                <span className="block text-[13px] text-muted">{t.minute(x.durataMin)}{x.descriere ? ` · ${x.descriere}` : ""}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {tip && (
        <>
          {tipuri.length === 1 && (
            <p className="mb-4 text-[14px] text-muted">
              <strong className="text-ink">{tip.titlu}</strong> · {t.minute(tip.durataMin)}{tip.locatie ? ` · ${tip.locatie}` : ""}
              {tip.descriere ? <span className="block">{tip.descriere}</span> : null}
            </p>
          )}
          <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <button type="button" onClick={() => lunaCuLuna(-1)} disabled={esteLunaCurenta} aria-label={t.lunaAnterioara} className="h-10 w-10 rounded-lg border border-line text-lg text-ink hover:bg-panel-2 disabled:opacity-30">
                  ‹
                </button>
                <p className="text-[15px] font-bold text-ink capitalize">
                  {LUNI[luna - 1]} {an}
                </p>
                <button type="button" onClick={() => lunaCuLuna(1)} aria-label={t.lunaUrmatoare} className="h-10 w-10 rounded-lg border border-line text-lg text-ink hover:bg-panel-2">
                  ›
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-[12px] font-semibold text-muted" aria-hidden="true">
                {ZILE.map((z) => (
                  <span key={z} className="py-1">
                    {z}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1" role="group" aria-label={t.ariaZile(LUNI[luna - 1], an)}>
                {grila.map((z, i) => {
                  if (z === null) return <span key={`g${i}`} />;
                  const iso = ISO(an, luna, z);
                  const liber = disponibile.has(iso);
                  return (
                    <button
                      key={iso}
                      type="button"
                      disabled={!liber}
                      aria-pressed={data === iso}
                      aria-label={`${dataLunga(iso, t.numere)}${liber ? "" : t.indisponibil}`}
                      onClick={() => alegeZi(iso)}
                      className={`aspect-square rounded-lg text-[14px] font-semibold transition ${
                        data === iso ? "bg-brand-green text-white" : liber ? "bg-brand-green-soft text-brand-green hover:bg-brand-green/20" : "text-muted/50"
                      }`}
                    >
                      {z}
                    </button>
                  );
                })}
              </div>
              {zile === null && <p className="mt-2 text-[13px] text-muted">{t.seIncarcaZilele}</p>}
              {zile && zile.length === 0 && <p className="mt-2 text-[13px] text-muted">{t.faraZile}</p>}
            </div>

            <div>
              {!data && <p className="text-[14px] text-muted">{t.alegeZi}</p>}
              {data && (
                <>
                  <p className="mb-2 text-[15px] font-bold text-ink first-letter:uppercase">{dataLunga(data, t.numere)}</p>
                  {sloturi === null && <p className="text-[13px] text-muted">{t.seIncarcaOrele}</p>}
                  {sloturi && sloturi.length === 0 && <p className="text-[14px] text-muted">{t.faraOre}</p>}
                  {sloturi && sloturi.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label={t.ariaOre}>
                      {sloturi.map((s) => (
                        <button
                          key={s.startUtc}
                          type="button"
                          aria-pressed={slot?.startUtc === s.startUtc}
                          onClick={() => setSlot(s)}
                          className={`min-h-11 rounded-lg border text-[14px] font-semibold transition ${slot?.startUtc === s.startUtc ? "border-brand-green bg-brand-green text-white" : "border-line bg-white text-ink hover:bg-panel-2"}`}
                        >
                          {s.ora}
                        </button>
                      ))}
                    </div>
                  )}
                  {sloturi && sloturi.length > 0 && <p className="mt-2 text-[12px] text-muted">{t.oreInOraRo}</p>}
                </>
              )}
            </div>
          </div>

          {slot && (
            <form onSubmit={trimite} className="mt-7 border-t border-line pt-6" noValidate>
              <p className="mb-4 text-[15px] text-ink">
                {t.programezi}<strong>{tip.titlu}</strong>{t.pe}<strong className="first-letter:uppercase">{dataOra(slot.startUtc, t.numere)}</strong>.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Camp eticheta={t.nume} eroare={erori.nume}>
                  <input value={p.nume} onChange={(e) => setP({ ...p, nume: e.target.value })} autoComplete="name" className={camp} />
                </Camp>
                <Camp eticheta={t.email} eroare={erori.email}>
                  <input type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} autoComplete="email" className={camp} />
                </Camp>
                <Camp eticheta={cereTelefon ? t.telefon : t.telefonOpt} eroare={erori.telefon}>
                  <input type="tel" value={p.telefon} onChange={(e) => setP({ ...p, telefon: e.target.value })} autoComplete="tel" placeholder="+40" className={camp} />
                </Camp>
                <Camp eticheta={t.organizatie} eroare={erori.organizatie}>
                  <input value={p.organizatie} onChange={(e) => setP({ ...p, organizatie: e.target.value })} autoComplete="organization" className={camp} />
                </Camp>
              </div>
              <Camp eticheta={t.mesaj} eroare={erori.mesaj} className="mt-3">
                <textarea value={p.mesaj} onChange={(e) => setP({ ...p, mesaj: e.target.value })} rows={3} maxLength={1000} className={`${camp} h-auto py-2.5`} />
              </Camp>
              {/* Capcană pentru roboți: invizibilă oamenilor. */}
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={capcana} onChange={(e) => setCapcana(e.target.value)} className="hidden" name="website" />
              <label className="mt-4 flex items-start gap-2.5 text-[13.5px] text-body">
                <input type="checkbox" checked={acord} onChange={(e) => setAcord(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-line" />
                <span>
                  {t.amCitit}<Link href="/gdpr" target="_blank" className="font-semibold text-brand-green underline">{t.politica}</Link>{t.amCititSfarsit}
                </span>
              </label>
              {eroare && (
                <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-800">
                  {eroare}
                </p>
              )}
              <button type="submit" disabled={pending} className="mt-5 min-h-12 w-full rounded-lg bg-brand-green px-6 text-[15px] font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-60 sm:w-auto">
                {pending ? t.seConfirma : t.confirma}
              </button>
            </form>
          )}
          {!slot && eroare && (
            <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-800">
              {eroare}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function Camp({ eticheta, eroare, children, className = "" }: { eticheta: string; eroare?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block text-[13px] font-semibold text-ink ${className}`}>
      {eticheta}
      <span className="mt-1 block">{children}</span>
      {eroare && <span className="mt-1 block text-[12.5px] font-normal text-red-700">{eroare}</span>}
    </label>
  );
}

// Butonul „Anulează programarea” din pagina cu linkul personal.
export function AnuleazaProgramare({ token, locale: localeProp }: { token: string; locale?: Locale }) {
  const t = PROGRAMARE_UI_DICT[useLocaleProgramare(localeProp)];
  const [pending, start] = useTransition();
  const [mesaj, setMesaj] = useState("");
  const [confirma, setConfirma] = useState(false);
  const [gata, setGata] = useState(false);
  if (gata) return <p role="status" className="rounded-lg bg-brand-green-soft px-3 py-2 text-[14px] text-brand-green">{t.anulataOk}</p>;
  return (
    <div>
      {confirma ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await anuleazaAction(token);
                if (r.ok) setGata(true);
                else setMesaj(r.eroare ?? t.nuAmPututAnula);
              })
            }
            className="min-h-11 rounded-lg bg-red-700 px-5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60"
          >
            {t.daAnuleaza}
          </button>
          <button type="button" onClick={() => setConfirma(false)} className="min-h-11 rounded-lg border border-line px-5 text-sm font-semibold text-ink hover:bg-panel-2">
            {t.nuPastrez}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirma(true)} className="min-h-11 rounded-lg border border-line px-5 text-sm font-semibold text-ink hover:bg-panel-2">
          {t.anuleazaProgramarea}
        </button>
      )}
      {mesaj && (
        <p role="alert" className="mt-3 text-[14px] text-red-700">
          {mesaj}
        </p>
      )}
    </div>
  );
}
