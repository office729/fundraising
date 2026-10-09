"use client";

import { ChevronDown, ChevronRight, ShieldAlert } from "lucide-react";
import { useState } from "react";

import { ritmAsteptat } from "@/lib/performanta-masurare";
import { ETICHETE_NIVEL, type NivelObiectiv, type ObiectivDto } from "@/lib/performanta-tipuri";

import { Avatar } from "../components/ui/avatar";
import { descriereTinta } from "./obiectiv-detaliu";
import { ActualitateChip, BaraProgres, StareBadge, culoareStare, dataScurta, formateazaValoare } from "./ui-comune";

type Comun = { obiective: ObiectivDto[]; azi: string; onDeschide: (o: ObiectivDto) => void };

const STIL_NIVEL: Record<NivelObiectiv, string> = {
  strategic: "bg-[var(--ci-purple-soft)] text-[var(--ci-purple)]",
  echipa: "bg-[var(--ci-blue-soft)] text-[var(--ci-blue)]",
  individual: "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]",
};

export function NivelChip({ nivel }: { nivel: NivelObiectiv }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-medium whitespace-nowrap ${STIL_NIVEL[nivel]}`}>{ETICHETE_NIVEL[nivel]}</span>;
}

function Responsabil({ nume }: { nume: string | null }) {
  if (!nume) return <span className="text-[12.5px] text-[var(--ci-text-muted)]">Nealocat</span>;
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5 text-[12.5px] text-[var(--ci-text)]">
      <Avatar name={nume} size="sm" className="!size-6 !text-[10px]" />
      <span className="truncate">{nume}</span>
    </span>
  );
}

// ───────── Listă ─────────

export function VedereLista({ obiective, azi, onDeschide }: Comun) {
  const [deschise, setDeschise] = useState<Set<string>>(new Set());
  const comuta = (id: string) =>
    setDeschise((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  return (
    <div className="overflow-hidden rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
      <div className="sticky top-0 z-[1] hidden grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_8.5rem] gap-4 border-b border-[var(--ci-border)] bg-[var(--ci-surface-2)] px-4 py-2 text-[12px] font-semibold text-[var(--ci-text-muted)] md:grid" aria-hidden>
        <span>Obiectiv</span>
        <span>Responsabil</span>
        <span>Progres</span>
        <span>Stare</span>
      </div>
      <ul className="divide-y divide-[var(--ci-border)]">
        {obiective.map((o) => {
          const activ = o.rezultate.filter((r) => r.status === "activ");
          const deschis = deschise.has(o.id);
          return (
            <li key={o.id}>
              <div className="grid items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_8.5rem]">
                <div className="flex min-w-0 items-start gap-1.5">
                  <button
                    type="button"
                    aria-expanded={deschis}
                    aria-label={deschis ? "Ascunde rezultatele-cheie" : "Arată rezultatele-cheie"}
                    onClick={() => comuta(o.id)}
                    disabled={activ.length === 0}
                    className="mt-0.5 shrink-0 rounded p-0.5 text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none disabled:opacity-30"
                  >
                    {deschis ? <ChevronDown className="size-4" aria-hidden /> : <ChevronRight className="size-4" aria-hidden />}
                  </button>
                  <div className="min-w-0">
                    <button type="button" onClick={() => onDeschide(o)} className="block max-w-full text-left text-[14px] font-semibold text-[var(--ci-text)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
                      <span className="line-clamp-2">{o.titlu}</span>
                    </button>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <NivelChip nivel={o.nivel} />
                      {o.departmentNume && <span className="text-[12px] text-[var(--ci-text-muted)]">{o.departmentNume}</span>}
                      <span className="text-[12px] text-[var(--ci-text-muted)]">{activ.length} rezultate-cheie</span>
                      {o.blocajeDeschise > 0 && (
                        <span className="inline-flex items-center gap-1 text-[12px] font-medium text-[var(--ci-red)]">
                          <ShieldAlert className="size-3.5" aria-hidden /> {o.blocajeDeschise} {o.blocajeDeschise === 1 ? "blocaj" : "blocaje"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <Responsabil nume={o.responsabilNume} />
                <div>
                  <BaraProgres progres={o.progres} stare={o.stare} perioada={{ start: o.perioadaStart, end: o.perioadaEnd }} azi={azi} eticheta={`Progres ${o.titlu}`} latime="w-full max-w-48" />
                  {o.rkCuDate < o.rkTotal && <p className="mt-0.5 text-[11.5px] text-[var(--ci-text-muted)]">{o.rkCuDate} din {o.rkTotal} cu date</p>}
                </div>
                <div className="flex flex-col items-start gap-1">
                  <StareBadge stare={o.stare} />
                  <ActualitateChip actualitate={o.actualitate} />
                </div>
              </div>
              {deschis && (
                <ul className="border-t border-[var(--ci-border)] bg-[var(--ci-surface-2)]/50 px-4 py-2 md:pl-12">
                  {activ.map((r) => (
                    <li key={r.id} className="grid items-center gap-x-4 gap-y-1 py-2 md:grid-cols-[minmax(0,2.4fr)_minmax(0,1.2fr)_minmax(0,1.6fr)_8.5rem]">
                      <div className="min-w-0">
                        <p className="truncate text-[13px] text-[var(--ci-text)]">{r.titlu}</p>
                        <p className="text-[11.5px] text-[var(--ci-text-muted)]">
                          {r.valoare === null ? "Fără valoare încă" : r.metoda === "binar" ? (r.valoare >= 1 ? "Realizat" : "Nerealizat") : formateazaValoare(r.valoare, r.unitate)} · țintă: {descriereTinta(r)}
                        </p>
                      </div>
                      <span className="truncate text-[12px] text-[var(--ci-text-muted)]">{r.responsabilNume ?? o.responsabilNume ?? ""}</span>
                      <BaraProgres progres={r.progres} stare={r.stare} perioada={{ start: o.perioadaStart, end: r.termen && r.termen < o.perioadaEnd ? r.termen : o.perioadaEnd }} azi={azi} eticheta={`Progres ${r.titlu}`} latime="w-full max-w-48" />
                      <StareBadge stare={r.stare} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ───────── Arbore ─────────

const ORDINE_NIVEL: Record<NivelObiectiv, number> = { strategic: 0, echipa: 1, individual: 2 };

export function VedereArbore({ obiective, azi, onDeschide }: Comun) {
  const ids = new Set(obiective.map((o) => o.id));
  const copii = new Map<string, ObiectivDto[]>();
  const radacini: ObiectivDto[] = [];
  for (const o of obiective) {
    if (o.parentId && ids.has(o.parentId)) copii.set(o.parentId, [...(copii.get(o.parentId) ?? []), o]);
    else radacini.push(o);
  }
  const sorteaza = (l: ObiectivDto[]) => [...l].sort((a, b) => ORDINE_NIVEL[a.nivel] - ORDINE_NIVEL[b.nivel] || a.titlu.localeCompare(b.titlu, "ro"));
  const nod = (o: ObiectivDto, adancime: number): React.ReactNode => {
    const fii = sorteaza(copii.get(o.id) ?? []);
    return (
      <li key={o.id} className={adancime > 0 ? "relative pl-5 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-px before:bg-[var(--ci-border)] last:before:h-5 after:absolute after:top-5 after:left-0 after:h-px after:w-4 after:bg-[var(--ci-border)]" : ""}>
        <button
          type="button"
          onClick={() => onDeschide(o)}
          className="my-1 flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 py-2.5 text-left transition-colors hover:border-[var(--ci-border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
        >
          <span className="min-w-0 flex-1 basis-56">
            <span className="block truncate text-[14px] font-semibold text-[var(--ci-text)]">{o.titlu}</span>
            <span className="mt-1 flex flex-wrap items-center gap-2">
              <NivelChip nivel={o.nivel} />
              <Responsabil nume={o.responsabilNume} />
            </span>
          </span>
          <BaraProgres progres={o.progres} stare={o.stare} perioada={{ start: o.perioadaStart, end: o.perioadaEnd }} azi={azi} eticheta={`Progres ${o.titlu}`} latime="w-28" />
          <StareBadge stare={o.stare} />
        </button>
        {fii.length > 0 && <ul className="ml-3">{fii.map((f) => nod(f, adancime + 1))}</ul>}
      </li>
    );
  };
  return (
    <div>
      <p className="mb-2 text-[12.5px] text-[var(--ci-text-muted)]">Fiecare obiectiv apare sub cel pe care îl sprijină. Progresul unui obiectiv superior nu se calculează din copii: fiecare are propriile rezultate-cheie.</p>
      <ul>{sorteaza(radacini).map((o) => nod(o, 0))}</ul>
    </div>
  );
}

// ───────── Cronologie ─────────

const LUNI = ["ian", "feb", "mar", "apr", "mai", "iun", "iul", "aug", "sep", "oct", "nov", "dec"];
const zile = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);

export function VedereCronologie({ obiective, azi, perioada, onDeschide }: Comun & { perioada: { start: string; end: string } }) {
  const total = Math.max(1, zile(perioada.start, perioada.end) + 1);
  const pct = (iso: string) => Math.max(0, Math.min(100, (zile(perioada.start, iso) / total) * 100));
  const luni: { eticheta: string; stanga: number }[] = [];
  for (let d = new Date(`${perioada.start.slice(0, 7)}-01T00:00:00Z`); d.toISOString().slice(0, 10) <= perioada.end; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
    const iso = d.toISOString().slice(0, 10);
    luni.push({ eticheta: `${LUNI[d.getUTCMonth()]}${perioada.start.slice(0, 4) !== perioada.end.slice(0, 4) ? ` ${String(d.getUTCFullYear()).slice(2)}` : ""}`, stanga: pct(iso < perioada.start ? perioada.start : iso) });
  }
  const aziIn = azi >= perioada.start && azi <= perioada.end;
  const sortate = [...obiective].sort((a, b) => (a.perioadaStart < b.perioadaStart ? -1 : a.perioadaStart > b.perioadaStart ? 1 : a.titlu.localeCompare(b.titlu, "ro")));
  return (
    <div className="overflow-hidden rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
      <div className="ci-scrollbar overflow-x-auto">
        <div className="min-w-[44rem]">
          <div className="grid grid-cols-[minmax(11rem,15rem)_1fr] border-b border-[var(--ci-border)] bg-[var(--ci-surface-2)] text-[12px] font-semibold text-[var(--ci-text-muted)]">
            <div className="sticky left-0 bg-[var(--ci-surface-2)] px-4 py-2">Obiectiv</div>
            <div className="relative h-8" aria-hidden>
              {luni.map((l) => (
                <span key={l.eticheta + l.stanga} className="absolute top-2 border-l border-[var(--ci-border)] pl-1.5 font-medium" style={{ left: `${l.stanga}%` }}>
                  {l.eticheta}
                </span>
              ))}
            </div>
          </div>
          <ul>
            {sortate.map((o) => {
              const s = pct(o.perioadaStart < perioada.start ? perioada.start : o.perioadaStart);
              const e = Math.max(s + 1.5, pct(o.perioadaEnd > perioada.end ? perioada.end : o.perioadaEnd) + 100 / total);
              const lat = Math.min(100 - s, e - s);
              const progres = Math.max(0, Math.min(1, o.progres ?? 0));
              const asteptat = ritmAsteptat(o.perioadaStart, o.perioadaEnd, azi);
              return (
                <li key={o.id} className="grid grid-cols-[minmax(11rem,15rem)_1fr] items-center border-b border-[var(--ci-border)] last:border-b-0">
                  <div className="sticky left-0 z-[1] min-w-0 bg-[var(--ci-surface)] px-4 py-2.5">
                    <button type="button" onClick={() => onDeschide(o)} className="block max-w-full truncate text-left text-[13px] font-semibold text-[var(--ci-text)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
                      {o.titlu}
                    </button>
                    <p className="mt-0.5 truncate text-[11.5px] text-[var(--ci-text-muted)]">
                      {o.responsabilNume ?? "Nealocat"} · {dataScurta(o.perioadaStart)} – {dataScurta(o.perioadaEnd)}
                    </p>
                  </div>
                  <div className="relative h-12">
                    {aziIn && <span aria-hidden className="absolute top-0 bottom-0 w-px bg-[var(--ci-text)]/40" style={{ left: `${pct(azi)}%` }} />}
                    <button
                      type="button"
                      tabIndex={-1}
                      aria-hidden
                      onClick={() => onDeschide(o)}
                      className="absolute top-3 h-6 overflow-hidden rounded-md bg-[var(--ci-surface-2)] ring-1 ring-[var(--ci-border)]"
                      style={{ left: `${s}%`, width: `${lat}%` }}
                      title={`${o.titlu}: ${o.progres === null ? "fără date" : `${Math.round((o.progres ?? 0) * 100)}%`}`}
                    >
                      <span className="block h-full" style={{ width: `${progres * 100}%`, background: culoareStare(o.stare), opacity: 0.85 }} />
                      {asteptat > 0.03 && asteptat < 0.99 && <span className="absolute top-0 h-full w-0.5 bg-[var(--ci-text)]/50" style={{ left: `${asteptat * 100}%` }} />}
                    </button>
                    {o.rezultate
                      .filter((r) => r.status === "activ" && r.termen && r.termen >= perioada.start && r.termen <= perioada.end)
                      .map((r) => (
                        <span key={r.id} aria-hidden title={`Termen: ${r.titlu} (${dataScurta(r.termen)})`} className="absolute top-[2.35rem] size-2 -translate-x-1/2 rotate-45 bg-[var(--ci-text)]/60" style={{ left: `${pct(r.termen!)}%` }} />
                      ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
      <p className="border-t border-[var(--ci-border)] px-4 py-2 text-[12px] text-[var(--ci-text-muted)]">
        Bara arată perioada obiectivului, partea colorată progresul, liniuța ritmul așteptat azi, linia verticală ziua de azi, rombul termenele rezultatelor-cheie.
      </p>
    </div>
  );
}
