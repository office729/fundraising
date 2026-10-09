"use client";

import { AlertOctagon, ArrowRight, Plus, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { BlocajDto } from "@/lib/performanta-activitati-tipuri";
import { ETICHETE_INCARCARE, type NivelIncarcare } from "@/lib/performanta-masurare";
import type { incarcaPaginaMeu } from "@/lib/performanta-pagini";
import type { RezultatDto } from "@/lib/performanta-tipuri";

import { Button } from "../components/ui/button";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import { CardActivitate } from "./activitate-ui";
import { ActivitatiProvider, useActivitati } from "./activitati-context";
import { DialogActualizare } from "./obiectiv-detaliu";
import { useCalePerf } from "./perf-cale";
import { ActualitateChip, BaraProgres, StareBadge, dataScurta } from "./ui-comune";

type Date = Awaited<ReturnType<typeof incarcaPaginaMeu>>;

export function SpatiulMeuClient({ orgSlug, d, perioada }: { orgSlug: string; d: Date; perioada: string }) {
  return (
    <ActivitatiProvider orgSlug={orgSlug} optiuni={d.context.optiuni} obiective={d.context.obiective} dependente={d.context.dependente}>
      <Continut orgSlug={orgSlug} d={d} perioada={perioada} />
    </ActivitatiProvider>
  );
}

const h = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");

function Continut({ orgSlug, d, perioada }: { orgSlug: string; d: Date; perioada: string }) {
  const { deschideForm, deschideBlocaj, deschideInchidere, mesaj } = useActivitati();
  const m = d.meu;
  const router = useRouter();
  const [actualizare, setActualizare] = useState<{ rezultat: RezultatDto; obiectivId: string } | null>(null);
  const { baza } = useCalePerf(orgSlug);

  if (!m.eu) {
    return (
      <EmptyState
        title="Nu ai încă un profil de angajat"
        description="Spațiul meu se construiește din profilul tău de angajat, legat de contul cu care ești conectat. Cere unui administrator să-l creeze în „Organizație & Echipă”."
        action={
          <Link href={`/${orgSlug}/crm/organizatie`} className="inline-flex h-9 items-center gap-2 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-3.5 text-sm font-medium text-white hover:bg-[var(--ci-primary-hover)]">
            Organizație și echipă <ArrowRight className="size-4" aria-hidden />
          </Link>
        }
      />
    );
  }

  const cap = m.capacitate;
  const obiectivAct = actualizare ? m.obiective.find((o) => o.id === actualizare.obiectivId) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="ci-display text-[17px] font-bold text-[var(--ci-text)]">Bună, {m.eu.nume.split(" ")[0]}</h2>
          <p className="text-[13px] text-[var(--ci-text-muted)]">
            Săptămâna aceasta: {m.saptamana.finalizate} din {m.saptamana.total} activități finalizate.
            {cap && (
              <>
                {" "}
                Estimat {h(cap.incarcareOre)} h din {h(cap.capacitateOre)} h disponibile ({ETICHETE_INCARCARE[cap.nivel as NivelIncarcare].toLowerCase()}).
                {cap.fara_estimare > 0 && ` ${cap.fara_estimare} activități nu au efort estimat.`}
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => deschideForm(null, { termen: m.azi })}>
            <Plus className="size-4" aria-hidden /> Activitate nouă
          </Button>
        </div>
      </div>

      <p role="status" aria-live="polite" className={mesaj ? `text-[13px] ${mesaj.eroare ? "rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[var(--ci-red)]" : "text-[var(--ci-green)]"}` : "sr-only"}>
        {mesaj?.text ?? ""}
      </p>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Prioritățile mele" subtitle="Restanțe, critice și ce are termen în această săptămână" action={<Link href={`${baza}/saptamana?resp=${m.eu.angajatId}`} className="text-[12.5px] font-medium text-[var(--ci-blue)] hover:underline">Planul complet</Link>} />
            {m.prioritati.length === 0 ? (
              <p className="text-[13px] text-[var(--ci-text-muted)]">Nu ai nimic urgent. Poți adăuga o activitate sau te poți uita la obiectivele tale.</p>
            ) : (
              <ul className="space-y-2.5">
                {m.prioritati.map((a) => (
                  <li key={a.id}>
                    <CardActivitate a={a} arataResponsabil={false} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {m.deAprobat.length > 0 && (
            <Card>
              <CardHeader title="De aprobat" subtitle="Activități ale echipei tale care așteaptă aprobarea ta" />
              <ul className="space-y-2.5">
                {m.deAprobat.map((a) => (
                  <li key={a.id}>
                    <CardActivitate a={a} />
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <div className="min-w-0 space-y-4">
          <Card>
            <CardHeader title="Blocaje" subtitle="Pe care le-ai raportat sau le poți rezolva" />
            {m.blocaje.length === 0 ? (
              <p className="text-[13px] text-[var(--ci-text-muted)]">Niciun blocaj deschis.</p>
            ) : (
              <ul className="space-y-2.5">
                {m.blocaje.map((b) => (
                  <li key={b.id}>
                    <BlocajCard b={b} onDeschide={() => deschideInchidere(b)} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title="De actualizat" subtitle="Rezultate-cheie ale căror date nu mai sunt la zi" />
            {m.rezultateDeActualizat.length === 0 ? (
              <p className="text-[13px] text-[var(--ci-text-muted)]">Toate rezultatele tale sunt la zi.</p>
            ) : (
              <ul className="space-y-2">
                {m.rezultateDeActualizat.map((r) => {
                  const rez = m.obiective.find((o) => o.id === r.obiectivId)?.rezultate.find((x) => x.id === r.rezultatId);
                  return (
                    <li key={r.rezultatId} className="flex items-center justify-between gap-3 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-[var(--ci-text)]">{r.titlu}</p>
                        <p className="truncate text-[12px] text-[var(--ci-text-muted)]">{r.obiectivTitlu}</p>
                        {rez && <ActualitateChip actualitate={rez.actualitate} />}
                      </div>
                      {rez && (
                        <Button size="sm" variant="primary" onClick={() => setActualizare({ rezultat: rez, obiectivId: r.obiectivId })}>
                          Actualizează
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Obiectivele mele" subtitle="Cele pe care le conduci sau la care contribui, în perioada curentă" action={<Link href={`${baza}/obiective?resp=${m.eu.angajatId}&perioada=${perioada}`} className="text-[12.5px] font-medium text-[var(--ci-blue)] hover:underline">Toate obiectivele</Link>} />
        {m.obiective.length === 0 ? (
          <p className="text-[13px] text-[var(--ci-text-muted)]">Nu ai obiective în perioada curentă.</p>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {m.obiective.map((o) => (
              <li key={o.id} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`${baza}/obiective?perioada=${perioada}&ob=${o.id}`} className="text-[13.5px] font-semibold text-[var(--ci-text)] hover:underline">
                    {o.titlu}
                  </Link>
                  <StareBadge stare={o.stare} />
                </div>
                <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">
                  {o.responsabilId === m.eu?.angajatId ? "Responsabil" : "Colaborator"} · până la {dataScurta(o.perioadaEnd)}
                </p>
                <div className="mt-2">
                  <BaraProgres progres={o.progres} stare={o.stare} perioada={{ start: o.perioadaStart, end: o.perioadaEnd }} azi={m.azi} eticheta={`Progres ${o.titlu}`} latime="w-full" />
                </div>
                <div className="mt-2 flex justify-end">
                  <Button size="sm" variant="ghost" onClick={() => deschideBlocaj({ obiectivId: o.id, titlu: o.titlu })}>
                    <ShieldAlert className="size-4" aria-hidden /> Raportează un blocaj
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {actualizare && obiectivAct && (
        <DialogActualizare
          orgSlug={orgSlug}
          rezultat={actualizare.rezultat}
          obiectiv={obiectivAct}
          onClose={() => setActualizare(null)}
          onSalvat={() => {
            setActualizare(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function BlocajCard({ b, onDeschide }: { b: BlocajDto; onDeschide: () => void }) {
  return (
    <button type="button" onClick={onDeschide} className={`block w-full rounded-[var(--ci-radius-card)] border p-3 text-left focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${b.intarziat ? "border-[var(--ci-red)]/40 bg-[var(--ci-red-soft)]/40" : "border-[var(--ci-border)]"}`}>
      <p className="flex items-start gap-1.5 text-[13px] font-medium text-[var(--ci-text)]">
        {b.intarziat ? <AlertOctagon className="mt-0.5 size-4 shrink-0 text-[var(--ci-red)]" aria-hidden /> : <ShieldAlert className="mt-0.5 size-4 shrink-0 text-[var(--ci-amber)]" aria-hidden />}
        <span>{b.activitateTitlu ?? b.obiectivTitlu ?? "Blocaj"}</span>
      </p>
      <p className="mt-0.5 pl-5 text-[12.5px] text-[var(--ci-text-muted)]">{b.motiv}</p>
      <p className="mt-0.5 pl-5 text-[12px] text-[var(--ci-text-muted)]">
        De rezolvat de {b.rezolvatorNume ?? "—"} · revenire {dataScurta(b.termenRevenire)}
        {b.intarziat && <span className="font-medium text-[var(--ci-red)]"> · termen depășit</span>}
        {b.necesitaDecizie && " · cere o decizie"}
      </p>
    </button>
  );
}
