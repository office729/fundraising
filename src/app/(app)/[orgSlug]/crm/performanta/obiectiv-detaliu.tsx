"use client";

import { Ban, CheckCircle2, ExternalLink, History, Link2, Pencil, RotateCcw, ShieldAlert, Users } from "lucide-react";
import { useState, useTransition } from "react";

import type { Locale } from "@/lib/i18n/config";
import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { PERFORMANTA_UI3_DICT } from "@/lib/i18n/dictionaries/performanta-ui-3";
import { aziRo, progresRezultat, stareRitm, type Incredere } from "@/lib/performanta-masurare";
import type { IstoricRezultat, ObiectivDto, RezultatDto } from "@/lib/performanta-tipuri";

import { Avatar } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { SidePanel } from "../components/ui/side-panel";
import { useLocale } from "../lib/locale-context";
import { actualizeazaRezultatAction, istoricRezultatAction, seteazaStatusObiectivAction } from "./obiective-actions";
import { ActualitateChip, BaraProgres, IncredereChip, StareBadge, dataCompleta, dataOra, dataScurta, formateazaValoare, procent } from "./ui-comune";

// `locale` e opțional (implicit „ro”): textul țintei urmează limba interfeței.
export function descriereTinta(r: Pick<RezultatDto, "metoda" | "tinta" | "tintaMax" | "unitate" | "nivelInitial" | "tipTinta">, locale: Locale = "ro"): string {
  const dict = PERFORMANTA_UI3_DICT[locale].detaliu;
  if (r.metoda === "binar") return dict.binar;
  if (r.tinta === null) return dict.faraTinta;
  const f = (v: number) => formateazaValoare(v, r.unitate, locale);
  if (r.metoda === "interval") return dict.intre(f(r.tinta), f(r.tintaMax ?? r.tinta));
  return `${r.metoda === "descrescator" ? dict.celMult : dict.celPutin} ${f(r.tinta)}${r.tipTinta === "periodic" ? dict.laFinal : dict.inPerioada}`;
}

export function DetaliuObiectiv({ orgSlug, obiectiv, azi, onClose, onEditeaza, onSchimbat }: { orgSlug: string; obiectiv: ObiectivDto | null; azi: string; onClose: () => void; onEditeaza: (o: ObiectivDto) => void; onSchimbat: () => void }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI3_DICT[locale].detaliu;
  const [actualizeaza, setActualizeaza] = useState<RezultatDto | null>(null);
  const o = obiectiv;
  return (
    <>
      <SidePanel open={!!o} onClose={onClose} lat title={o?.titlu ?? dict.titluImplicit} subtitle={o ? `${PERFORMANTA_UI_DICT[locale].comune.nivel[o.nivel]} · ${dataCompleta(o.perioadaStart, locale)} – ${dataCompleta(o.perioadaEnd, locale)}` : undefined}>
        {o && <ContinutObiectiv key={o.id} orgSlug={orgSlug} o={o} azi={azi} onEditeaza={onEditeaza} onSchimbat={onSchimbat} onActualizeaza={setActualizeaza} />}
      </SidePanel>
      {/* Dialogul stă în afara panoului: panoul are transform, iar un element fix din interior s-ar poziționa față de panou, nu față de ecran. */}
      {o && <DialogActualizare orgSlug={orgSlug} rezultat={actualizeaza} obiectiv={o} onClose={() => setActualizeaza(null)} onSalvat={() => { setActualizeaza(null); onSchimbat(); }} />}
    </>
  );
}

function ContinutObiectiv({ orgSlug, o, azi, onEditeaza, onSchimbat, onActualizeaza }: { orgSlug: string; o: ObiectivDto; azi: string; onEditeaza: (o: ObiectivDto) => void; onSchimbat: () => void; onActualizeaza: (r: RezultatDto) => void }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI3_DICT[locale].detaliu;
  const comune = PERFORMANTA_UI_DICT[locale].comune;
  const [anuleaza, setAnuleaza] = useState(false);
  const [motiv, setMotiv] = useState("");
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function schimbaStatus(status: "activ" | "finalizat" | "anulat") {
    setEroare(null);
    start(async () => {
      const r = await seteazaStatusObiectivAction(orgSlug, o.id, status, motiv);
      if (!r.ok) {
        setEroare(r.eroare);
        return;
      }
      setAnuleaza(false);
      onSchimbat();
    });
  }

  return (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StareBadge stare={o.stare} />
              <ActualitateChip actualitate={o.actualitate} />
              {o.status === "finalizat" && <span className="rounded-full bg-[var(--ci-blue-soft)] px-2 py-0.5 text-[12px] font-medium text-[var(--ci-blue)]">{dict.marcatFinalizat}</span>}
              {o.status === "anulat" && <span className="rounded-full bg-[var(--ci-surface-2)] px-2 py-0.5 text-[12px] font-medium text-[var(--ci-text-muted)]">{dict.anulat}</span>}
              <span className="ml-auto text-[12px] text-[var(--ci-text-muted)]">{comune.vizibilitate[o.vizibilitate]}</span>
            </div>

            {o.status === "anulat" && o.motivAnulare && (
              <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-3 py-2 text-[13px] text-[var(--ci-text-muted)]">
                <strong className="text-[var(--ci-text)]">{dict.motivAnulare}</strong> {o.motivAnulare}
              </p>
            )}
            {o.descriere && <p className="text-[13.5px] leading-relaxed text-[var(--ci-text)]">{o.descriere}</p>}

            <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[12px] text-[var(--ci-text-muted)]">{dict.progres}</p>
                  <p className="ci-display ci-tabular text-2xl font-bold text-[var(--ci-text)]">{procent(o.progres, 0, locale)}</p>
                </div>
                <p className="text-right text-[12px] text-[var(--ci-text-muted)]">
                  {dict.rkCuDate(o.rkCuDate, o.rkTotal)}
                  {o.rkCuDate < o.rkTotal && <span className="block">{dict.faraDateNuZero}</span>}
                </p>
              </div>
              <div className="mt-2">
                <BaraProgres progres={o.progres} stare={o.stare} perioada={{ start: o.perioadaStart, end: o.perioadaEnd }} azi={azi} eticheta={PERFORMANTA_UI_DICT[locale].prezentare.progresAria(o.titlu)} latime="w-full" />
              </div>
              <p className="mt-1.5 text-[11.5px] text-[var(--ci-text-muted)]">{dict.notaLiniuta}</p>
            </div>

            <dl className="grid gap-x-4 gap-y-3 text-[13px] sm:grid-cols-2">
              <div>
                <dt className="text-[12px] text-[var(--ci-text-muted)]">{dict.responsabilPrincipal}</dt>
                <dd className="mt-1 flex items-center gap-2 font-medium text-[var(--ci-text)]">
                  {o.responsabilNume ? (
                    <>
                      <Avatar name={o.responsabilNume} size="sm" />
                      {o.responsabilNume}
                    </>
                  ) : (
                    comune.nealocat
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-[var(--ci-text-muted)]">{dict.departament}</dt>
                <dd className="mt-1 font-medium text-[var(--ci-text)]">{o.departmentNume ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="flex items-center gap-1 text-[12px] text-[var(--ci-text-muted)]">
                  <Users className="size-3.5" aria-hidden /> {dict.colaboratori}
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {o.colaboratori.length === 0 ? (
                    <span className="text-[var(--ci-text-muted)]">{dict.faraColaboratori}</span>
                  ) : (
                    o.colaboratori.map((c) => (
                      <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ci-border)] py-0.5 pr-2.5 pl-0.5 text-[12.5px]">
                        <Avatar name={c.nume} size="sm" className="!size-5 !text-[9px]" />
                        {c.nume}
                      </span>
                    ))
                  )}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2 text-[12.5px]">
              <span className="rounded-full bg-[var(--ci-surface-2)] px-2.5 py-1 text-[var(--ci-text-muted)]">
                {dict.activitati(o.nrActivitatiFinalizate, o.nrActivitati)}
              </span>
              <span className={`rounded-full px-2.5 py-1 ${o.blocajeDeschise > 0 ? "bg-[var(--ci-red-soft)] font-medium text-[var(--ci-red)]" : "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]"}`}>
                {o.blocajeDeschise > 0 && <ShieldAlert className="mr-1 inline size-3.5" aria-hidden />}
                {dict.blocajeDeschise(o.blocajeDeschise)}
              </span>
            </div>

            <section aria-labelledby="rk-titlu">
              <h3 id="rk-titlu" className="ci-display mb-2 text-[14px] font-semibold text-[var(--ci-text)]">
                {dict.rezultateCheie}
              </h3>
              {o.rezultate.filter((r) => r.status === "activ").length === 0 ? (
                <p className="rounded-[var(--ci-radius-card)] border border-dashed border-[var(--ci-border)] p-4 text-center text-[13px] text-[var(--ci-text-muted)]">{dict.faraRezultate}</p>
              ) : (
                <ul className="space-y-2.5">
                  {o.rezultate
                    .filter((r) => r.status === "activ")
                    .map((r) => (
                      <li key={r.id}>
                        <CardRezultat orgSlug={orgSlug} r={r} o={o} azi={azi} onActualizeaza={() => onActualizeaza(r)} />
                      </li>
                    ))}
                </ul>
              )}
              {o.rezultate.some((r) => r.status === "anulat") && <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">{dict.anulateIstoric(o.rezultate.filter((r) => r.status === "anulat").length)}</p>}
            </section>

            {o.legaturi.length > 0 && (
              <section aria-labelledby="leg-titlu">
                <h3 id="leg-titlu" className="ci-display mb-2 flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ci-text)]">
                  <Link2 className="size-4" aria-hidden /> {dict.legaturi}
                </h3>
                <ul className="space-y-1 text-[13px]">
                  {o.legaturi.map((l) => (
                    <li key={l.id} className="text-[var(--ci-text-muted)]">
                      {dict.tipLeg[l.tip] ?? l.tip}: <span className="font-medium text-[var(--ci-text)]">{l.titlu}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {eroare && (
              <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
                {eroare}
              </p>
            )}

            {o.poateEdita && (
              <div className="space-y-3 border-t border-[var(--ci-border)] pt-4">
                {anuleaza ? (
                  <div className="space-y-2">
                    <Label htmlFor="ob-motiv">{dict.deCeAnulezi}</Label>
                    <Textarea id="ob-motiv" rows={2} value={motiv} onChange={(e) => setMotiv(e.target.value)} placeholder={dict.deCeAnuleziPlaceholder} />
                    <div className="flex gap-2">
                      <Button type="button" variant="danger" size="sm" loading={pending} onClick={() => schimbaStatus("anulat")}>
                        {dict.anuleazaObiectivul}
                      </Button>
                      <Button type="button" size="sm" onClick={() => setAnuleaza(false)}>
                        {dict.renunta}
                      </Button>
                    </div>
                    <p className="text-[12px] text-[var(--ci-text-muted)]">{dict.istoricPastrat}</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="primary" size="sm" onClick={() => onEditeaza(o)}>
                      <Pencil className="size-4" aria-hidden /> {dict.editeaza}
                    </Button>
                    {o.status === "activ" && (
                      <Button type="button" size="sm" loading={pending} onClick={() => schimbaStatus("finalizat")}>
                        <CheckCircle2 className="size-4" aria-hidden /> {dict.marcheazaFinalizat}
                      </Button>
                    )}
                    {o.status !== "activ" && (
                      <Button type="button" size="sm" loading={pending} onClick={() => schimbaStatus("activ")}>
                        <RotateCcw className="size-4" aria-hidden /> {dict.redeschide}
                      </Button>
                    )}
                    {o.status !== "anulat" && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setAnuleaza(true)}>
                        <Ban className="size-4" aria-hidden /> {dict.anuleaza}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
  );
}

function CardRezultat({ orgSlug, r, o, azi, onActualizeaza }: { orgSlug: string; r: RezultatDto; o: ObiectivDto; azi: string; onActualizeaza: () => void }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI3_DICT[locale].detaliu;
  const comune = PERFORMANTA_UI_DICT[locale].comune;
  const [istoric, setIstoric] = useState<IstoricRezultat[] | null>(null);
  const [vezi, setVezi] = useState(false);
  const [incarca, start] = useTransition();
  const metoda = comune.metoda[r.metoda]?.eticheta ?? r.metoda;
  const perioada = { start: o.perioadaStart, end: r.termen && r.termen < o.perioadaEnd ? r.termen : o.perioadaEnd };

  function comuta() {
    const nou = !vezi;
    setVezi(nou);
    if (nou && istoric === null) start(async () => {
      const h = await istoricRezultatAction(orgSlug, r.id);
      setIstoric(Array.isArray(h) ? h : []);
    });
  }

  return (
    <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="text-[14px] font-semibold text-[var(--ci-text)]">{r.titlu}</h4>
          <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">
            {dict.pondere(metoda, descriereTinta(r, locale), r.pondere)}
          </p>
        </div>
        <StareBadge stare={r.stare} />
      </div>

      <div className="mt-2.5">
        <BaraProgres progres={r.progres} stare={r.stare} perioada={perioada} azi={azi} eticheta={PERFORMANTA_UI_DICT[locale].prezentare.progresAria(r.titlu)} latime="w-full" />
      </div>
      <p className="ci-tabular mt-1.5 text-[13px] text-[var(--ci-text)]">
        {r.valoare === null ? (
          <span className="text-[var(--ci-text-muted)]">{dict.nuExistaValoare}</span>
        ) : (
          <>
            <strong>{r.metoda === "binar" ? (r.valoare >= 1 ? PERFORMANTA_UI3_DICT[locale].vederi.realizat : PERFORMANTA_UI3_DICT[locale].vederi.nerealizat) : formateazaValoare(r.valoare, r.unitate, locale)}</strong>
            {r.metoda !== "binar" && r.tinta !== null && <span className="text-[var(--ci-text-muted)]">{dict.dinTinta(formateazaValoare(r.tinta, r.unitate, locale))}</span>}
            {r.peste && <span className="ml-1.5 font-medium text-[var(--ci-blue)]">{dict.tintaDepasita}</span>}
          </>
        )}
      </p>
      {r.avertisment && <p className="mt-1 text-[12px] text-[var(--ci-amber)]">{r.avertisment}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <ActualitateChip actualitate={r.actualitate} />
        {r.ultimaActualizare && <span className="text-[12px] text-[var(--ci-text-muted)]">{dict.actualizat(dataOra(r.ultimaActualizare, locale))}</span>}
        <IncredereChip incredere={r.incredere} />
        {r.termen && <span className="text-[12px] text-[var(--ci-text-muted)]">{dict.termenR(dataScurta(r.termen, locale))}</span>}
      </div>

      <dl className="mt-2.5 space-y-1 text-[12px] text-[var(--ci-text-muted)]">
        <div>
          <dt className="inline font-medium text-[var(--ci-text)]">{dict.sursa}</dt>
          <dd className="inline">{r.sursaEticheta ?? dict.introdusManual(comune.frecventa[r.frecventaActualizare].toLowerCase(), r.responsabilNume)}</dd>
        </div>
        {r.formula && (
          <div>
            <dt className="inline font-medium text-[var(--ci-text)]">{dict.formula}</dt>
            <dd className="inline">{r.formula}</dd>
          </div>
        )}
        {r.reguli && (
          <div>
            <dt className="inline font-medium text-[var(--ci-text)]">{dict.includeExclude}</dt>
            <dd className="inline">{r.reguli}</dd>
          </div>
        )}
        {r.atribuire && (
          <div>
            <dt className="inline font-medium text-[var(--ci-text)]">{dict.atribuire}</dt>
            <dd className="inline">{r.atribuire}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {r.poateActualiza && o.status === "activ" && (
          <Button type="button" variant="primary" size="sm" onClick={onActualizeaza}>
            {dict.actualizeazaValoarea}
          </Button>
        )}
        {r.sursa !== "manual" && <span className="text-[12px] text-[var(--ci-text-muted)]">{dict.automat}</span>}
        <Button type="button" variant="ghost" size="sm" aria-expanded={vezi} onClick={comuta} className="ml-auto">
          <History className="size-4" aria-hidden /> {dict.istoric}
        </Button>
      </div>

      {vezi && (
        <div className="mt-2 border-t border-[var(--ci-border)] pt-2">
          {incarca || istoric === null ? (
            <p className="text-[12.5px] text-[var(--ci-text-muted)]">{dict.seIncarca}</p>
          ) : istoric.length === 0 ? (
            <p className="text-[12.5px] text-[var(--ci-text-muted)]">{dict.faraModificari}</p>
          ) : (
            <ol className="space-y-2">
              {istoric.map((h) => (
                <li key={h.id} className="text-[12.5px]">
                  <p className="text-[var(--ci-text)]">
                    <strong>{textIstoric(h, r, locale)}</strong>
                    <span className="text-[var(--ci-text-muted)]">
                      {" "}
                      · {h.autor ?? dict.sistem} · {dataOra(h.la, locale)}
                    </span>
                  </p>
                  {h.comentariu && <p className="mt-0.5 text-[var(--ci-text-muted)]">„{h.comentariu}”</p>}
                  {h.dovadaUrl && (
                    <a href={h.dovadaUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-[var(--ci-blue)] underline-offset-2 hover:underline">
                      {dict.dovada} <ExternalLink className="size-3" aria-hidden />
                    </a>
                  )}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}

function textIstoric(h: IstoricRezultat, r: RezultatDto, locale: Locale): string {
  const dict = PERFORMANTA_UI3_DICT[locale].detaliu;
  const vd = PERFORMANTA_UI3_DICT[locale].vederi;
  const f = (v: number | null) => (v === null ? "—" : r.metoda === "binar" ? (v >= 1 ? vd.realizat : vd.nerealizat) : formateazaValoare(v, r.unitate, locale));
  if (h.tip === "valoare") return dict.istValoare(f(h.valoareAnterioara), f(h.valoare));
  if (h.tip === "tinta") return dict.istTinta(f(h.valoareAnterioara), f(h.tinta));
  if (h.tip === "responsabil") return dict.istResponsabil;
  if (h.tip === "incredere") return dict.istIncredere(h.incredere ? PERFORMANTA_UI_DICT[locale].comune.incredere[h.incredere] : "—");
  return dict.istNota;
}

export function DialogActualizare({ rezultat, ...p }: { orgSlug: string; rezultat: RezultatDto | null; obiectiv: ObiectivDto; onClose: () => void; onSalvat: () => void }) {
  if (!rezultat) return null;
  return <FormularActualizare key={rezultat.id} rezultat={rezultat} {...p} />;
}

function FormularActualizare({ orgSlug, rezultat, obiectiv, onClose, onSalvat }: { orgSlug: string; rezultat: RezultatDto; obiectiv: ObiectivDto; onClose: () => void; onSalvat: () => void }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI3_DICT[locale].detaliu;
  const comune = PERFORMANTA_UI_DICT[locale].comune;
  const [valoare, setValoare] = useState(rezultat.valoare === null ? "" : String(rezultat.valoare));
  const [comentariu, setComentariu] = useState("");
  const [dovada, setDovada] = useState("");
  const [incredere, setIncredere] = useState<Incredere | "">(rezultat.incredere ?? "");
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const r = rezultat;
  const nr = valoare.trim() === "" ? null : Number(valoare.replace(",", "."));
  const valid = nr !== null && Number.isFinite(nr);
  const previzualizare = valid ? progresRezultat({ metoda: r.metoda, nivelInitial: r.nivelInitial, tinta: r.tinta, tintaMax: r.tintaMax, valoare: nr }) : null;
  const stare = previzualizare ? stareRitm({ progres: previzualizare.progres, start: obiectiv.perioadaStart, end: r.termen && r.termen < obiectiv.perioadaEnd ? r.termen : obiectiv.perioadaEnd, azi: aziRo(), status: "activ" }) : null;

  function trimite() {
    if (!valid) {
      setEroare(dict.introduNumar);
      return;
    }
    start(async () => {
      const x = await actualizeazaRezultatAction(orgSlug, r.id, { valoare: nr, comentariu, dovadaUrl: dovada, incredere: incredere || null });
      if (!x.ok) {
        setEroare(x.eroare);
        return;
      }
      onSalvat();
    });
  }

  return (
    <Dialog open onClose={onClose} title={dict.actualizeaza(r.titlu)} width="max-w-md">
      <form
        className="space-y-3.5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          trimite();
        }}
      >
        {r.metoda === "binar" ? (
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-medium text-[var(--ci-text)]">{dict.starea}</legend>
            <div className="flex gap-2">
              {[
                { v: "1", t: PERFORMANTA_UI3_DICT[locale].vederi.realizat },
                { v: "0", t: dict.nerealizatInca },
              ].map((o) => (
                <label key={o.v} className={`flex-1 cursor-pointer rounded-[var(--ci-radius-btn)] border px-3 py-2 text-center text-[13px] focus-within:ring-2 focus-within:ring-[var(--ci-primary)] ${valoare === o.v ? "border-[var(--ci-primary)] bg-[var(--ci-primary)]/10 font-medium" : "border-[var(--ci-border)] text-[var(--ci-text-muted)]"}`}>
                  <input type="radio" name="binar" value={o.v} checked={valoare === o.v} onChange={() => setValoare(o.v)} className="sr-only" />
                  {o.t}
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <div>
            <Label htmlFor="ac-valoare">{dict.valoareaActuala}{r.unitate ? ` (${r.unitate})` : ""}</Label>
            <Input id="ac-valoare" inputMode="decimal" autoFocus value={valoare} onChange={(e) => setValoare(e.target.value)} />
            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">
              {r.tipTinta === "cumulativ" ? dict.cumulativ : dict.valoareaDeAcum}
              {dict.tintaPunct(descriereTinta(r, locale))}
            </p>
          </div>
        )}

        <div aria-live="polite" className="flex min-h-[2.25rem] items-center gap-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-3 py-2 text-[13px]">
          {previzualizare && stare ? (
            <>
              <span className="text-[var(--ci-text-muted)]">{dict.cuAceastaValoare}</span>
              <strong className="ci-tabular text-[var(--ci-text)]">{procent(previzualizare.progres, 0, locale)}</strong>
              <StareBadge stare={stare} />
            </>
          ) : (
            <span className="text-[var(--ci-text-muted)]">{dict.introduValoarea}</span>
          )}
        </div>
        {previzualizare?.avertisment && <p className="text-[12px] text-[var(--ci-amber)]">{previzualizare.avertisment}</p>}

        <div>
          <Label htmlFor="ac-com">{dict.comentariu}</Label>
          <Textarea id="ac-com" rows={2} maxLength={1000} value={comentariu} onChange={(e) => setComentariu(e.target.value)} placeholder={dict.comentariuPlaceholder} />
        </div>
        <div>
          <Label htmlFor="ac-dov">{dict.linkDovada}</Label>
          <Input id="ac-dov" type="url" inputMode="url" value={dovada} onChange={(e) => setDovada(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <Label htmlFor="ac-inc">{dict.catSigur}</Label>
          <Select id="ac-inc" value={incredere} onChange={(e) => setIncredere(e.target.value as Incredere | "")}>
            <option value="">{dict.nuSpecific}</option>
            {Object.keys(comune.incredere).map((i) => (
              <option key={i} value={i}>
                {comune.incredere[i]}
              </option>
            ))}
          </Select>
        </div>
        {eroare && (
          <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[13px] text-[var(--ci-red)]">
            {eroare}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" onClick={onClose}>
            {PERFORMANTA_UI3_DICT[locale].form.renunta}
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            {dict.salveaza}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
