"use client";

import { Ban, CheckCircle2, ExternalLink, History, Link2, Pencil, RotateCcw, ShieldAlert, Users } from "lucide-react";
import { useState, useTransition } from "react";

import { ETICHETE_INCREDERE, METODE, aziRo, progresRezultat, stareRitm, type Incredere } from "@/lib/performanta-masurare";
import { ETICHETE_FRECVENTA, ETICHETE_NIVEL, ETICHETE_VIZIBILITATE, type IstoricRezultat, type ObiectivDto, type RezultatDto } from "@/lib/performanta-tipuri";

import { Avatar } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Dialog } from "../components/ui/dialog";
import { Input, Label, Select, Textarea } from "../components/ui/input";
import { SidePanel } from "../components/ui/side-panel";
import { actualizeazaRezultatAction, istoricRezultatAction, seteazaStatusObiectivAction } from "./obiective-actions";
import { ActualitateChip, BaraProgres, IncredereChip, StareBadge, dataCompleta, dataOra, dataScurta, formateazaValoare, procent } from "./ui-comune";

const TIP_LEG: Record<string, string> = { sprijina: "Sprijină", depinde_de: "Depinde de", legat: "Legat de" };

export function descriereTinta(r: Pick<RezultatDto, "metoda" | "tinta" | "tintaMax" | "unitate" | "nivelInitial" | "tipTinta">): string {
  if (r.metoda === "binar") return "Realizat";
  if (r.tinta === null) return "Fără țintă";
  const f = (v: number) => formateazaValoare(v, r.unitate);
  if (r.metoda === "interval") return `între ${f(r.tinta)} și ${f(r.tintaMax ?? r.tinta)}`;
  return `${r.metoda === "descrescator" ? "cel mult" : "cel puțin"} ${f(r.tinta)}${r.tipTinta === "periodic" ? " (la final)" : " în perioadă"}`;
}

export function DetaliuObiectiv({ orgSlug, obiectiv, azi, onClose, onEditeaza, onSchimbat }: { orgSlug: string; obiectiv: ObiectivDto | null; azi: string; onClose: () => void; onEditeaza: (o: ObiectivDto) => void; onSchimbat: () => void }) {
  const [actualizeaza, setActualizeaza] = useState<RezultatDto | null>(null);
  const o = obiectiv;
  return (
    <>
      <SidePanel open={!!o} onClose={onClose} lat title={o?.titlu ?? "Obiectiv"} subtitle={o ? `${ETICHETE_NIVEL[o.nivel]} · ${dataCompleta(o.perioadaStart)} – ${dataCompleta(o.perioadaEnd)}` : undefined}>
        {o && <ContinutObiectiv key={o.id} orgSlug={orgSlug} o={o} azi={azi} onEditeaza={onEditeaza} onSchimbat={onSchimbat} onActualizeaza={setActualizeaza} />}
      </SidePanel>
      {/* Dialogul stă în afara panoului: panoul are transform, iar un element fix din interior s-ar poziționa față de panou, nu față de ecran. */}
      {o && <DialogActualizare orgSlug={orgSlug} rezultat={actualizeaza} obiectiv={o} onClose={() => setActualizeaza(null)} onSalvat={() => { setActualizeaza(null); onSchimbat(); }} />}
    </>
  );
}

function ContinutObiectiv({ orgSlug, o, azi, onEditeaza, onSchimbat, onActualizeaza }: { orgSlug: string; o: ObiectivDto; azi: string; onEditeaza: (o: ObiectivDto) => void; onSchimbat: () => void; onActualizeaza: (r: RezultatDto) => void }) {
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
              {o.status === "finalizat" && <span className="rounded-full bg-[var(--ci-blue-soft)] px-2 py-0.5 text-[12px] font-medium text-[var(--ci-blue)]">Marcat finalizat</span>}
              {o.status === "anulat" && <span className="rounded-full bg-[var(--ci-surface-2)] px-2 py-0.5 text-[12px] font-medium text-[var(--ci-text-muted)]">Anulat</span>}
              <span className="ml-auto text-[12px] text-[var(--ci-text-muted)]">{ETICHETE_VIZIBILITATE[o.vizibilitate]}</span>
            </div>

            {o.status === "anulat" && o.motivAnulare && (
              <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-3 py-2 text-[13px] text-[var(--ci-text-muted)]">
                <strong className="text-[var(--ci-text)]">Motivul anulării:</strong> {o.motivAnulare}
              </p>
            )}
            {o.descriere && <p className="text-[13.5px] leading-relaxed text-[var(--ci-text)]">{o.descriere}</p>}

            <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3.5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[12px] text-[var(--ci-text-muted)]">Progres</p>
                  <p className="ci-display ci-tabular text-2xl font-bold text-[var(--ci-text)]">{procent(o.progres)}</p>
                </div>
                <p className="text-right text-[12px] text-[var(--ci-text-muted)]">
                  {o.rkCuDate} din {o.rkTotal} rezultate-cheie au date
                  {o.rkCuDate < o.rkTotal && <span className="block">Cele fără date nu se socotesc ca zero.</span>}
                </p>
              </div>
              <div className="mt-2">
                <BaraProgres progres={o.progres} stare={o.stare} perioada={{ start: o.perioadaStart, end: o.perioadaEnd }} azi={azi} eticheta={`Progres ${o.titlu}`} latime="w-full" />
              </div>
              <p className="mt-1.5 text-[11.5px] text-[var(--ci-text-muted)]">Liniuța de pe bară arată unde ar trebui să fim azi, dacă ritmul e uniform.</p>
            </div>

            <dl className="grid gap-x-4 gap-y-3 text-[13px] sm:grid-cols-2">
              <div>
                <dt className="text-[12px] text-[var(--ci-text-muted)]">Responsabil principal</dt>
                <dd className="mt-1 flex items-center gap-2 font-medium text-[var(--ci-text)]">
                  {o.responsabilNume ? (
                    <>
                      <Avatar name={o.responsabilNume} size="sm" />
                      {o.responsabilNume}
                    </>
                  ) : (
                    "Nealocat"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-[12px] text-[var(--ci-text-muted)]">Departament</dt>
                <dd className="mt-1 font-medium text-[var(--ci-text)]">{o.departmentNume ?? "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="flex items-center gap-1 text-[12px] text-[var(--ci-text-muted)]">
                  <Users className="size-3.5" aria-hidden /> Colaboratori
                </dt>
                <dd className="mt-1 flex flex-wrap gap-1.5">
                  {o.colaboratori.length === 0 ? (
                    <span className="text-[var(--ci-text-muted)]">Fără colaboratori</span>
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
                Activități: {o.nrActivitatiFinalizate}/{o.nrActivitati} finalizate
              </span>
              <span className={`rounded-full px-2.5 py-1 ${o.blocajeDeschise > 0 ? "bg-[var(--ci-red-soft)] font-medium text-[var(--ci-red)]" : "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]"}`}>
                {o.blocajeDeschise > 0 && <ShieldAlert className="mr-1 inline size-3.5" aria-hidden />}
                {o.blocajeDeschise} {o.blocajeDeschise === 1 ? "blocaj deschis" : "blocaje deschise"}
              </span>
            </div>

            <section aria-labelledby="rk-titlu">
              <h3 id="rk-titlu" className="ci-display mb-2 text-[14px] font-semibold text-[var(--ci-text)]">
                Rezultate-cheie
              </h3>
              {o.rezultate.filter((r) => r.status === "activ").length === 0 ? (
                <p className="rounded-[var(--ci-radius-card)] border border-dashed border-[var(--ci-border)] p-4 text-center text-[13px] text-[var(--ci-text-muted)]">Niciun rezultat-cheie. Editează obiectivul ca să adaugi cum îl măsurăm.</p>
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
              {o.rezultate.some((r) => r.status === "anulat") && <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">{o.rezultate.filter((r) => r.status === "anulat").length} rezultat(e) anulate, păstrate doar în istoric.</p>}
            </section>

            {o.legaturi.length > 0 && (
              <section aria-labelledby="leg-titlu">
                <h3 id="leg-titlu" className="ci-display mb-2 flex items-center gap-1.5 text-[14px] font-semibold text-[var(--ci-text)]">
                  <Link2 className="size-4" aria-hidden /> Legături
                </h3>
                <ul className="space-y-1 text-[13px]">
                  {o.legaturi.map((l) => (
                    <li key={l.id} className="text-[var(--ci-text-muted)]">
                      {TIP_LEG[l.tip] ?? l.tip}: <span className="font-medium text-[var(--ci-text)]">{l.titlu}</span>
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
                    <Label htmlFor="ob-motiv">De ce se anulează obiectivul?</Label>
                    <Textarea id="ob-motiv" rows={2} value={motiv} onChange={(e) => setMotiv(e.target.value)} placeholder="ex. prioritățile s-au schimbat după decizia consiliului" />
                    <div className="flex gap-2">
                      <Button type="button" variant="danger" size="sm" loading={pending} onClick={() => schimbaStatus("anulat")}>
                        Anulează obiectivul
                      </Button>
                      <Button type="button" size="sm" onClick={() => setAnuleaza(false)}>
                        Renunță
                      </Button>
                    </div>
                    <p className="text-[12px] text-[var(--ci-text-muted)]">Istoricul rămâne păstrat; obiectivul dispare din calculele de progres ale perioadei.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="primary" size="sm" onClick={() => onEditeaza(o)}>
                      <Pencil className="size-4" aria-hidden /> Editează
                    </Button>
                    {o.status === "activ" && (
                      <Button type="button" size="sm" loading={pending} onClick={() => schimbaStatus("finalizat")}>
                        <CheckCircle2 className="size-4" aria-hidden /> Marchează finalizat
                      </Button>
                    )}
                    {o.status !== "activ" && (
                      <Button type="button" size="sm" loading={pending} onClick={() => schimbaStatus("activ")}>
                        <RotateCcw className="size-4" aria-hidden /> Redeschide
                      </Button>
                    )}
                    {o.status !== "anulat" && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setAnuleaza(true)}>
                        <Ban className="size-4" aria-hidden /> Anulează
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
  const [istoric, setIstoric] = useState<IstoricRezultat[] | null>(null);
  const [vezi, setVezi] = useState(false);
  const [incarca, start] = useTransition();
  const metoda = METODE.find((m) => m.id === r.metoda)?.eticheta ?? r.metoda;
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
            {metoda} · {descriereTinta(r)} · pondere {r.pondere}
          </p>
        </div>
        <StareBadge stare={r.stare} />
      </div>

      <div className="mt-2.5">
        <BaraProgres progres={r.progres} stare={r.stare} perioada={perioada} azi={azi} eticheta={`Progres ${r.titlu}`} latime="w-full" />
      </div>
      <p className="ci-tabular mt-1.5 text-[13px] text-[var(--ci-text)]">
        {r.valoare === null ? (
          <span className="text-[var(--ci-text-muted)]">Nu există încă o valoare</span>
        ) : (
          <>
            <strong>{r.metoda === "binar" ? (r.valoare >= 1 ? "Realizat" : "Nerealizat") : formateazaValoare(r.valoare, r.unitate)}</strong>
            {r.metoda !== "binar" && r.tinta !== null && <span className="text-[var(--ci-text-muted)]"> din {formateazaValoare(r.tinta, r.unitate)}</span>}
            {r.peste && <span className="ml-1.5 font-medium text-[var(--ci-blue)]">țintă depășită</span>}
          </>
        )}
      </p>
      {r.avertisment && <p className="mt-1 text-[12px] text-[var(--ci-amber)]">{r.avertisment}</p>}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <ActualitateChip actualitate={r.actualitate} />
        {r.ultimaActualizare && <span className="text-[12px] text-[var(--ci-text-muted)]">Actualizat {dataOra(r.ultimaActualizare)}</span>}
        <IncredereChip incredere={r.incredere} />
        {r.termen && <span className="text-[12px] text-[var(--ci-text-muted)]">Termen {dataScurta(r.termen)}</span>}
      </div>

      <dl className="mt-2.5 space-y-1 text-[12px] text-[var(--ci-text-muted)]">
        <div>
          <dt className="inline font-medium text-[var(--ci-text)]">Sursă: </dt>
          <dd className="inline">{r.sursaEticheta ?? `Introdus manual, ${ETICHETE_FRECVENTA[r.frecventaActualizare].toLowerCase()}${r.responsabilNume ? ` de ${r.responsabilNume}` : ""}`}</dd>
        </div>
        {r.formula && (
          <div>
            <dt className="inline font-medium text-[var(--ci-text)]">Formula: </dt>
            <dd className="inline">{r.formula}</dd>
          </div>
        )}
        {r.reguli && (
          <div>
            <dt className="inline font-medium text-[var(--ci-text)]">Include / exclude: </dt>
            <dd className="inline">{r.reguli}</dd>
          </div>
        )}
        {r.atribuire && (
          <div>
            <dt className="inline font-medium text-[var(--ci-text)]">Atribuire: </dt>
            <dd className="inline">{r.atribuire}</dd>
          </div>
        )}
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {r.poateActualiza && o.status === "activ" && (
          <Button type="button" variant="primary" size="sm" onClick={onActualizeaza}>
            Actualizează valoarea
          </Button>
        )}
        {r.sursa !== "manual" && <span className="text-[12px] text-[var(--ci-text-muted)]">Se actualizează automat din sursă.</span>}
        <Button type="button" variant="ghost" size="sm" aria-expanded={vezi} onClick={comuta} className="ml-auto">
          <History className="size-4" aria-hidden /> Istoric
        </Button>
      </div>

      {vezi && (
        <div className="mt-2 border-t border-[var(--ci-border)] pt-2">
          {incarca || istoric === null ? (
            <p className="text-[12.5px] text-[var(--ci-text-muted)]">Se încarcă…</p>
          ) : istoric.length === 0 ? (
            <p className="text-[12.5px] text-[var(--ci-text-muted)]">Nicio modificare înregistrată încă.</p>
          ) : (
            <ol className="space-y-2">
              {istoric.map((h) => (
                <li key={h.id} className="text-[12.5px]">
                  <p className="text-[var(--ci-text)]">
                    <strong>{textIstoric(h, r)}</strong>
                    <span className="text-[var(--ci-text-muted)]">
                      {" "}
                      · {h.autor ?? "sistem"} · {dataOra(h.la)}
                    </span>
                  </p>
                  {h.comentariu && <p className="mt-0.5 text-[var(--ci-text-muted)]">„{h.comentariu}”</p>}
                  {h.dovadaUrl && (
                    <a href={h.dovadaUrl} target="_blank" rel="noopener noreferrer" className="mt-0.5 inline-flex items-center gap-1 text-[var(--ci-blue)] underline-offset-2 hover:underline">
                      Dovadă <ExternalLink className="size-3" aria-hidden />
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

function textIstoric(h: IstoricRezultat, r: RezultatDto): string {
  const f = (v: number | null) => (v === null ? "—" : r.metoda === "binar" ? (v >= 1 ? "Realizat" : "Nerealizat") : formateazaValoare(v, r.unitate));
  if (h.tip === "valoare") return `Valoare ${f(h.valoareAnterioara)} → ${f(h.valoare)}`;
  if (h.tip === "tinta") return `Țintă schimbată: ${f(h.valoareAnterioara)} → ${f(h.tinta)}`;
  if (h.tip === "responsabil") return "Responsabil schimbat";
  if (h.tip === "incredere") return `Încredere: ${h.incredere ? ETICHETE_INCREDERE[h.incredere] : "—"}`;
  return "Notă";
}

export function DialogActualizare({ rezultat, ...p }: { orgSlug: string; rezultat: RezultatDto | null; obiectiv: ObiectivDto; onClose: () => void; onSalvat: () => void }) {
  if (!rezultat) return null;
  return <FormularActualizare key={rezultat.id} rezultat={rezultat} {...p} />;
}

function FormularActualizare({ orgSlug, rezultat, obiectiv, onClose, onSalvat }: { orgSlug: string; rezultat: RezultatDto; obiectiv: ObiectivDto; onClose: () => void; onSalvat: () => void }) {
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
      setEroare("Introdu valoarea actuală (un număr).");
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
    <Dialog open onClose={onClose} title={`Actualizează: ${r.titlu}`} width="max-w-md">
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
            <legend className="mb-1.5 text-[13px] font-medium text-[var(--ci-text)]">Starea acum</legend>
            <div className="flex gap-2">
              {[
                { v: "1", t: "Realizat" },
                { v: "0", t: "Nerealizat încă" },
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
            <Label htmlFor="ac-valoare">Valoarea actuală{r.unitate ? ` (${r.unitate})` : ""}</Label>
            <Input id="ac-valoare" inputMode="decimal" autoFocus value={valoare} onChange={(e) => setValoare(e.target.value)} />
            <p className="mt-1 text-[12px] text-[var(--ci-text-muted)]">
              {r.tipTinta === "cumulativ" ? "Totalul de la începutul perioadei, nu doar ce s-a adăugat de la ultima actualizare." : "Valoarea de acum."} Țintă: {descriereTinta(r)}.
            </p>
          </div>
        )}

        <div aria-live="polite" className="flex min-h-[2.25rem] items-center gap-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-3 py-2 text-[13px]">
          {previzualizare && stare ? (
            <>
              <span className="text-[var(--ci-text-muted)]">Cu această valoare:</span>
              <strong className="ci-tabular text-[var(--ci-text)]">{procent(previzualizare.progres)}</strong>
              <StareBadge stare={stare} />
            </>
          ) : (
            <span className="text-[var(--ci-text-muted)]">Introdu valoarea ca să vezi progresul.</span>
          )}
        </div>
        {previzualizare?.avertisment && <p className="text-[12px] text-[var(--ci-amber)]">{previzualizare.avertisment}</p>}

        <div>
          <Label htmlFor="ac-com">Comentariu (opțional)</Label>
          <Textarea id="ac-com" rows={2} maxLength={1000} value={comentariu} onChange={(e) => setComentariu(e.target.value)} placeholder="Ce s-a schimbat, ce urmează." />
        </div>
        <div>
          <Label htmlFor="ac-dov">Link către dovadă (opțional)</Label>
          <Input id="ac-dov" type="url" inputMode="url" value={dovada} onChange={(e) => setDovada(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <Label htmlFor="ac-inc">Cât de sigur ești de valoare</Label>
          <Select id="ac-inc" value={incredere} onChange={(e) => setIncredere(e.target.value as Incredere | "")}>
            <option value="">Nu specific</option>
            {(Object.keys(ETICHETE_INCREDERE) as Incredere[]).map((i) => (
              <option key={i} value={i}>
                {ETICHETE_INCREDERE[i]}
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
            Renunță
          </Button>
          <Button type="submit" variant="primary" loading={pending}>
            Salvează
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
