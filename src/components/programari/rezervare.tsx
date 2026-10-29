"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";

import { anuleazaAction, rezervaAction, sloturiAction, zileDisponibileAction } from "@/app/programare/actions";
import type { TipPublic } from "@/lib/programari/server";
import type { Slot } from "@/lib/programari/sloturi";

type Props = {
  tipuri: TipPublic[];
  cereTelefon: boolean;
  // De unde se programează (hub, consultanta, onboarding, programare): ajunge la echipă, în email.
  sursa: string;
  prefill?: { nume?: string; email?: string; organizatie?: string };
  className?: string;
};

const LUNI = ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"];
const ZILE = ["L", "Ma", "Mi", "J", "V", "S", "D"];
const ISO = (an: number, luna: number, zi: number) => `${an}-${String(luna).padStart(2, "0")}-${String(zi).padStart(2, "0")}`;
const dataLunga = (iso: string) => new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
const dataOra = (utc: string) => new Intl.DateTimeFormat("ro-RO", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Bucharest" }).format(new Date(utc));

const camp = "h-11 w-full rounded-lg border border-line bg-white px-3 text-[15px] text-ink placeholder:text-muted/70 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/25";

// Calendarul intern de programări: alegi tipul, ziua și ora dintre cele libere, apoi îți lași datele. Nu încarcă niciun serviciu extern și nu setează cookie-uri.
export function Rezervare({ tipuri, cereTelefon, sursa, prefill, className = "" }: Props) {
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

  const tip = tipuri.find((t) => t.id === tipId);

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
      setEroare("Bifează că ai citit Politica de confidențialitate.");
      return;
    }
    start(async () => {
      const r = await rezervaAction({ tipId, startUtc: slot.startUtc, persoana: p, capcana, sursa }).catch(() => null);
      if (!r) {
        setEroare("Nu am putut trimite acum. Încearcă din nou.");
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
        Programările nu sunt deschise acum. Scrie-ne la <a href="mailto:vlad.placinta@alexandrit.ro" className="font-semibold text-brand-green underline">vlad.placinta@alexandrit.ro</a> și găsim împreună o oră.
      </div>
    );
  }

  if (gata) {
    return (
      <div className={`rounded-2xl border border-line bg-white p-6 sm:p-8 ${className}`} role="status">
        <p className="text-sm font-bold tracking-wide text-brand-green uppercase">Programare confirmată</p>
        <h3 className="font-display mt-1 text-2xl font-bold text-ink">{tip?.titlu}</h3>
        <p className="mt-2 text-[16px] text-ink first-letter:uppercase">{dataOra(gata.startLa)}</p>
        <p className="text-sm text-muted">Ora României · {tip?.durataMin} de minute{tip?.locatie ? ` · ${tip.locatie}` : ""}</p>
        <p className="mt-4 text-[15px] text-body">{gata.mesaj}</p>
        <p className="mt-2 text-sm text-muted">Ți-am trimis confirmarea pe {p.email}.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={`/programare/${gata.token}/ics`} className="inline-flex min-h-11 items-center rounded-lg bg-brand-green px-5 text-sm font-bold text-white hover:bg-brand-green-hover">
            Adaugă în calendar
          </a>
          <Link href={`/programare/${gata.token}`} className="inline-flex min-h-11 items-center rounded-lg border border-line px-5 text-sm font-semibold text-ink hover:bg-panel-2">
            Anulează sau mută
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl border border-line bg-white p-5 sm:p-7 ${className}`}>
      {tipuri.length > 1 && (
        <fieldset className="mb-6">
          <legend className="mb-2 text-sm font-semibold text-ink">Ce fel de întâlnire vrei?</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {tipuri.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={t.id === tipId}
                onClick={() => {
                  setTipId(t.id);
                  setData("");
                  setSloturi(null);
                  setSlot(null);
                }}
                className={`rounded-xl border p-3.5 text-left transition ${t.id === tipId ? "border-brand-green bg-brand-green-soft" : "border-line bg-white hover:bg-panel-2"}`}
              >
                <span className="block text-[15px] font-bold text-ink">{t.titlu}</span>
                <span className="block text-[13px] text-muted">{t.durataMin} de minute{t.descriere ? ` · ${t.descriere}` : ""}</span>
              </button>
            ))}
          </div>
        </fieldset>
      )}

      {tip && (
        <>
          {tipuri.length === 1 && (
            <p className="mb-4 text-[14px] text-muted">
              <strong className="text-ink">{tip.titlu}</strong> · {tip.durataMin} de minute{tip.locatie ? ` · ${tip.locatie}` : ""}
              {tip.descriere ? <span className="block">{tip.descriere}</span> : null}
            </p>
          )}
          <div className="grid gap-6 md:grid-cols-[minmax(0,320px)_1fr]">
            <div>
              <div className="mb-2 flex items-center justify-between">
                <button type="button" onClick={() => lunaCuLuna(-1)} disabled={esteLunaCurenta} aria-label="Luna anterioară" className="h-10 w-10 rounded-lg border border-line text-lg text-ink hover:bg-panel-2 disabled:opacity-30">
                  ‹
                </button>
                <p className="text-[15px] font-bold text-ink capitalize">
                  {LUNI[luna - 1]} {an}
                </p>
                <button type="button" onClick={() => lunaCuLuna(1)} aria-label="Luna următoare" className="h-10 w-10 rounded-lg border border-line text-lg text-ink hover:bg-panel-2">
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
              <div className="grid grid-cols-7 gap-1" role="group" aria-label={`Zilele din ${LUNI[luna - 1]} ${an}`}>
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
                      aria-label={`${dataLunga(iso)}${liber ? "" : ", indisponibil"}`}
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
              {zile === null && <p className="mt-2 text-[13px] text-muted">Se încarcă zilele libere…</p>}
              {zile && zile.length === 0 && <p className="mt-2 text-[13px] text-muted">Nu mai sunt zile libere în luna aceasta. Încearcă luna următoare.</p>}
            </div>

            <div>
              {!data && <p className="text-[14px] text-muted">Alege o zi din calendar (zilele colorate au ore libere).</p>}
              {data && (
                <>
                  <p className="mb-2 text-[15px] font-bold text-ink first-letter:uppercase">{dataLunga(data)}</p>
                  {sloturi === null && <p className="text-[13px] text-muted">Se încarcă orele…</p>}
                  {sloturi && sloturi.length === 0 && <p className="text-[14px] text-muted">Nu mai sunt ore libere în ziua asta.</p>}
                  {sloturi && sloturi.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4" role="group" aria-label="Orele libere (ora României)">
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
                  {sloturi && sloturi.length > 0 && <p className="mt-2 text-[12px] text-muted">Orele sunt în ora României.</p>}
                </>
              )}
            </div>
          </div>

          {slot && (
            <form onSubmit={trimite} className="mt-7 border-t border-line pt-6" noValidate>
              <p className="mb-4 text-[15px] text-ink">
                Programezi <strong>{tip.titlu}</strong> pe <strong className="first-letter:uppercase">{dataOra(slot.startUtc)}</strong>.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Camp eticheta="Nume și prenume" eroare={erori.nume}>
                  <input value={p.nume} onChange={(e) => setP({ ...p, nume: e.target.value })} autoComplete="name" className={camp} />
                </Camp>
                <Camp eticheta="Email" eroare={erori.email}>
                  <input type="email" value={p.email} onChange={(e) => setP({ ...p, email: e.target.value })} autoComplete="email" className={camp} />
                </Camp>
                <Camp eticheta={cereTelefon ? "Telefon" : "Telefon (opțional)"} eroare={erori.telefon}>
                  <input type="tel" value={p.telefon} onChange={(e) => setP({ ...p, telefon: e.target.value })} autoComplete="tel" placeholder="+40" className={camp} />
                </Camp>
                <Camp eticheta="Organizația (opțional)" eroare={erori.organizatie}>
                  <input value={p.organizatie} onChange={(e) => setP({ ...p, organizatie: e.target.value })} autoComplete="organization" className={camp} />
                </Camp>
              </div>
              <Camp eticheta="Ce vrei să discutăm? (opțional)" eroare={erori.mesaj} className="mt-3">
                <textarea value={p.mesaj} onChange={(e) => setP({ ...p, mesaj: e.target.value })} rows={3} maxLength={1000} className={`${camp} h-auto py-2.5`} />
              </Camp>
              {/* Capcană pentru roboți: invizibilă oamenilor. */}
              <input type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" value={capcana} onChange={(e) => setCapcana(e.target.value)} className="hidden" name="website" />
              <label className="mt-4 flex items-start gap-2.5 text-[13.5px] text-body">
                <input type="checkbox" checked={acord} onChange={(e) => setAcord(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-line" />
                <span>
                  Am citit <Link href="/gdpr" target="_blank" className="font-semibold text-brand-green underline">Politica de confidențialitate</Link>: datele mele sunt folosite doar ca să organizăm această întâlnire.
                </span>
              </label>
              {eroare && (
                <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-[14px] text-red-800">
                  {eroare}
                </p>
              )}
              <button type="submit" disabled={pending} className="mt-5 min-h-12 w-full rounded-lg bg-brand-green px-6 text-[15px] font-bold text-white transition hover:bg-brand-green-hover disabled:opacity-60 sm:w-auto">
                {pending ? "Se confirmă…" : "Confirmă programarea"}
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
export function AnuleazaProgramare({ token }: { token: string }) {
  const [pending, start] = useTransition();
  const [mesaj, setMesaj] = useState("");
  const [confirma, setConfirma] = useState(false);
  const [gata, setGata] = useState(false);
  if (gata) return <p role="status" className="rounded-lg bg-brand-green-soft px-3 py-2 text-[14px] text-brand-green">Programarea a fost anulată. Poți alege oricând altă oră.</p>;
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
                else setMesaj(r.eroare ?? "Nu am putut anula.");
              })
            }
            className="min-h-11 rounded-lg bg-red-700 px-5 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-60"
          >
            Da, anulează programarea
          </button>
          <button type="button" onClick={() => setConfirma(false)} className="min-h-11 rounded-lg border border-line px-5 text-sm font-semibold text-ink hover:bg-panel-2">
            Nu, o păstrez
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirma(true)} className="min-h-11 rounded-lg border border-line px-5 text-sm font-semibold text-ink hover:bg-panel-2">
          Anulează programarea
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
