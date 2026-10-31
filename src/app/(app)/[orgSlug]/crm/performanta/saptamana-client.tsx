"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Columns3, List, Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { PERFORMANTA_UI2_DICT } from "@/lib/i18n/dictionaries/performanta-ui-2";
import type { StatusActivitate } from "@/lib/performanta-activitati-reguli";
import type { ActivitateDto } from "@/lib/performanta-activitati-tipuri";
import type { DateSaptamana } from "@/lib/performanta-pagini";

import { Button } from "../components/ui/button";
import { Input, Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { useLocale } from "../lib/locale-context";
import { CardActivitate } from "./activitate-ui";
import { ActivitatiProvider, useActivitati } from "./activitati-context";
import { dataScurta } from "./ui-comune";

type Vedere = "lista" | "tabla" | "calendar";
const VEDERI: { id: Vedere; Icon: typeof List }[] = [
  { id: "lista", Icon: List },
  { id: "tabla", Icon: Columns3 },
  { id: "calendar", Icon: CalendarDays },
];
const adauga = (iso: string, zile: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + zile * 86400000).toISOString().slice(0, 10);

export function SaptamanaClient({ orgSlug, d }: { orgSlug: string; d: DateSaptamana }) {
  return (
    <ActivitatiProvider orgSlug={orgSlug} optiuni={d.context.optiuni} obiective={d.context.obiective} dependente={d.context.dependente}>
      <Continut d={d} />
    </ActivitatiProvider>
  );
}

function Continut({ d }: { d: DateSaptamana }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI2_DICT[locale].saptamana;
  const comune = PERFORMANTA_UI_DICT[locale].comune;
  const ZILE = dict.zile;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const { deschideForm, mesaj } = useActivitati();
  const vedere = (["lista", "tabla", "calendar"].includes(sp.get("vedere") ?? "") ? sp.get("vedere") : "lista") as Vedere;
  const [q, setQ] = useState(sp.get("q") ?? "");
  const optiuni = d.context.optiuni;

  // „+ Adaugă” din antet trimite aici cu ?nou=activitate: formularul se deschide direct.
  useEffect(() => {
    if (sp.get("nou") !== "activitate") return;
    deschideForm(null, { termen: d.azi });
    const n = new URLSearchParams(sp.toString());
    n.delete("nou");
    router.replace(n.toString() ? `${pathname}?${n.toString()}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sp.get("nou")]);

  const seteaza = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) n.set(k, v);
      else n.delete(k);
    }
    router.replace(n.toString() ? `${pathname}?${n.toString()}` : pathname, { scroll: false });
  };
  useEffect(() => {
    if ((sp.get("q") ?? "") === q.trim()) return;
    const t = setTimeout(() => seteaza({ q: q.trim() || null }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const zile = Array.from({ length: 7 }, (_, i) => adauga(d.luni, i));
  const restante = d.activitati.filter((a) => a.termen && a.termen < d.luni);
  const inSaptamana = d.activitati.filter((a) => a.termen && a.termen >= d.luni);
  const total = d.activitati.length;
  const gata = d.activitati.filter((a) => a.status === "finalizat").length;
  const esteCurenta = d.azi >= d.luni && d.azi <= d.duminica;
  const filtreActive = ["resp", "ob", "prioritate", "status", "q"].some((k) => sp.get(k));

  const pozitie = useMemo(() => {
    const [a, l] = [new Date(`${d.luni}T12:00:00Z`), new Date(`${d.duminica}T12:00:00Z`)];
    const f = (x: Date) => x.toLocaleDateString(locale === "ro" ? "ro-RO" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
    return `${f(a)} – ${f(l)} ${l.getUTCFullYear()}`;
  }, [d.luni, d.duminica, locale]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
            <button type="button" aria-label={dict.saptamanaAnterioara} onClick={() => seteaza({ luni: adauga(d.luni, -7) })} className="rounded-l-[var(--ci-radius-btn)] p-2 text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <span className="ci-tabular min-w-[10.5rem] px-2 text-center text-[13px] font-semibold text-[var(--ci-text)]" aria-live="polite">
              {pozitie}
            </span>
            <button type="button" aria-label={dict.saptamanaUrmatoare} onClick={() => seteaza({ luni: adauga(d.luni, 7) })} className="rounded-r-[var(--ci-radius-btn)] p-2 text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
          {!esteCurenta && (
            <Button size="sm" onClick={() => seteaza({ luni: null })}>
              {dict.saptamanaAceasta}
            </Button>
          )}
          <span className="text-[13px] text-[var(--ci-text-muted)]">
            {dict.finalizate(gata, total)}
          </span>
        </div>
        <Button variant="primary" disabled={!optiuni.euAngajatId && !optiuni.admin} onClick={() => deschideForm(null, { termen: esteCurenta ? d.azi : d.luni })}>
          <Plus className="size-4" aria-hidden /> {dict.activitateNoua}
        </Button>
      </div>

      {d.capacitate && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-2.5 text-[13px]">
          <span className="font-semibold text-[var(--ci-text)]">{d.capacitate.nume}</span>
          <span className="ci-tabular text-[var(--ci-text-muted)]">
            {dict.capacitate(locale === "ro" ? String(d.capacitate.incarcareOre).replace(".", ",") : String(d.capacitate.incarcareOre), locale === "ro" ? String(d.capacitate.capacitateOre).replace(".", ",") : String(d.capacitate.capacitateOre))}
          </span>
          <span className="font-medium text-[var(--ci-text)]">{comune.incarcare[d.capacitate.nivel]}</span>
          {d.capacitate.zileAbsente > 0 && <span className="text-[var(--ci-text-muted)]">{dict.zileAbsenta(d.capacitate.zileAbsente)}</span>}
          {d.capacitate.fara_estimare > 0 && <span className="text-[var(--ci-amber)]">{dict.faraEstimare(d.capacitate.fara_estimare)}</span>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2" role="search" aria-label={dict.filtreActivitati}>
        <div className="min-w-[12rem] flex-1 sm:max-w-xs">
          <Input aria-label={dict.cautaAria} icon={<Search className="size-4" aria-hidden />} value={q} onChange={(e) => setQ(e.target.value)} placeholder={dict.cautaPlaceholder} />
        </div>
        <Select aria-label={dict.responsabil} className="!w-auto min-w-36" value={sp.get("resp") ?? ""} onChange={(e) => seteaza({ resp: e.target.value || null })}>
          <option value="">{dict.toti}</option>
          {optiuni.euAngajatId && <option value={optiuni.euAngajatId}>{dict.aleMele}</option>}
          {optiuni.angajati.filter((a) => a.id !== optiuni.euAngajatId).map((a) => (
            <option key={a.id} value={a.id}>
              {a.nume}
            </option>
          ))}
        </Select>
        <Select aria-label={dict.obiectiv} className="!w-auto min-w-36" value={sp.get("ob") ?? ""} onChange={(e) => seteaza({ ob: e.target.value || null })}>
          <option value="">{dict.toateObiectivele}</option>
          {d.context.obiective.map((o) => (
            <option key={o.id} value={o.id}>
              {o.titlu}
            </option>
          ))}
        </Select>
        <Select aria-label={dict.prioritate} className="!w-auto min-w-32" value={sp.get("prioritate") ?? ""} onChange={(e) => seteaza({ prioritate: e.target.value || null })}>
          <option value="">{dict.oriceprioritate}</option>
          {Object.keys(comune.prioritate).map((p) => (
            <option key={p} value={p}>
              {comune.prioritate[p]}
            </option>
          ))}
        </Select>
        <Select aria-label={dict.stare} className="!w-auto min-w-32" value={sp.get("status") ?? ""} onChange={(e) => seteaza({ status: e.target.value || null })}>
          <option value="">{dict.faraAnulate}</option>
          <option value="deschise">{dict.doarDeschise}</option>
          {Object.keys(comune.statusAct).map((s) => (
            <option key={s} value={s}>
              {comune.statusAct[s]}
            </option>
          ))}
          <option value="toate">{dict.toate}</option>
        </Select>
        {filtreActive && (
          <Button variant="ghost" size="sm" onClick={() => { setQ(""); seteaza({ resp: null, ob: null, prioritate: null, status: null, q: null }); }}>
            {dict.stergeFiltrele}
          </Button>
        )}
        <div role="group" aria-label={dict.vedere} className="ml-auto flex rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-0.5">
          {VEDERI.map(({ id, Icon }) => (
            <button key={id} type="button" aria-pressed={vedere === id} onClick={() => seteaza({ vedere: id === "lista" ? null : id })} className={`inline-flex items-center gap-1.5 rounded-[calc(var(--ci-radius-btn)-2px)] px-2.5 py-1 text-[12.5px] font-medium focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${vedere === id ? "bg-[var(--ci-surface-2)] text-[var(--ci-text)]" : "text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]"}`}>
              <Icon className="size-4" aria-hidden />
              <span className="max-sm:sr-only">{dict.vederi[id]}</span>
            </button>
          ))}
        </div>
      </div>

      <p role="status" aria-live="polite" className={mesaj ? `text-[13px] ${mesaj.eroare ? "rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[var(--ci-red)]" : "text-[var(--ci-green)]"}` : "sr-only"}>
        {mesaj?.text ?? ""}
      </p>

      {total === 0 && d.neplanificate.length === 0 ? (
        <EmptyState
          title={filtreActive ? dict.gol.filtrateTitlu : dict.gol.saptamanaTitlu}
          description={filtreActive ? dict.gol.filtrateDescriere : dict.gol.saptamanaDescriere}
          action={!filtreActive ? <Button variant="primary" onClick={() => deschideForm(null, { termen: d.azi })}><Plus className="size-4" aria-hidden /> {dict.gol.prima}</Button> : undefined}
        />
      ) : vedere === "lista" ? (
        <div className="space-y-5">
          {restante.length > 0 && <Sectiune titlu={dict.restante} nota={dict.restanteNota} activitati={restante} urgent />}
          {zile.map((z, i) => {
            const ale = inSaptamana.filter((a) => a.termen === z);
            return ale.length === 0 ? null : <Sectiune key={z} titlu={`${ZILE[i]}, ${dataScurta(z, locale)}`} activitati={ale} azi={z === d.azi} />;
          })}
          {d.neplanificate.length > 0 && <Sectiune titlu={dict.faraTermen} nota={dict.faraTermenNota} activitati={d.neplanificate} />}
        </div>
      ) : vedere === "tabla" ? (
        <Tabla activitati={d.activitati} />
      ) : (
        <Calendar zile={zile} azi={d.azi} restante={restante} inSaptamana={inSaptamana} />
      )}
    </div>
  );
}

function Sectiune({ titlu, nota, activitati, urgent, azi }: { titlu: string; nota?: string; activitati: ActivitateDto[]; urgent?: boolean; azi?: boolean }) {
  const dict = PERFORMANTA_UI2_DICT[useLocale()].saptamana;
  return (
    <section aria-label={titlu}>
      <h3 className="mb-2 flex flex-wrap items-baseline gap-2 text-[13.5px] font-semibold text-[var(--ci-text)]">
        <span className={urgent ? "text-[var(--ci-red)]" : ""}>{titlu}</span>
        {azi && <span className="rounded-full bg-[var(--ci-primary)] px-2 py-px text-[11px] font-medium text-white">{dict.azi}</span>}
        <span className="text-[12px] font-normal text-[var(--ci-text-muted)]">{nota ?? dict.nrActivitati(activitati.length)}</span>
      </h3>
      <ul className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {activitati.map((a) => (
          <li key={a.id}>
            <CardActivitate a={a} />
          </li>
        ))}
      </ul>
    </section>
  );
}

const COLOANE: StatusActivitate[] = ["de_facut", "in_lucru", "in_asteptare", "blocat", "finalizat"];

function Tabla({ activitati }: { activitati: ActivitateDto[] }) {
  const dict = PERFORMANTA_UI2_DICT[useLocale()].saptamana;
  return (
    <div className="ci-scrollbar -mx-1 overflow-x-auto px-1 pb-2">
      <div className="grid min-w-[62rem] grid-cols-5 gap-3">
        {COLOANE.map((c) => {
          const ale = activitati.filter((a) => a.status === c);
          const titlu = dict.coloane[c];
          return (
            <section key={c} aria-label={titlu} className="rounded-[var(--ci-radius-card)] bg-[var(--ci-surface-2)] p-2.5">
              <h3 className="mb-2 flex items-center justify-between px-1 text-[13px] font-semibold text-[var(--ci-text)]">
                {titlu}
                <span className="ci-tabular rounded-full bg-[var(--ci-surface)] px-2 py-px text-[12px] font-medium text-[var(--ci-text-muted)]">{ale.length}</span>
              </h3>
              <ul className="space-y-2">
                {ale.map((a) => (
                  <li key={a.id}>
                    <CardActivitate a={a} compact />
                  </li>
                ))}
                {ale.length === 0 && <li className="px-1 py-4 text-center text-[12px] text-[var(--ci-text-muted)]">{dict.nimicAici}</li>}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">{dict.notaTabla}</p>
    </div>
  );
}

function Calendar({ zile, azi, restante, inSaptamana }: { zile: string[]; azi: string; restante: ActivitateDto[]; inSaptamana: ActivitateDto[] }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI2_DICT[locale].saptamana;
  const ZILE = dict.zile;
  return (
    <div className="space-y-3">
      {restante.length > 0 && (
        <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-red)]/30 bg-[var(--ci-red-soft)]/40 p-2.5">
          <h3 className="mb-2 px-1 text-[13px] font-semibold text-[var(--ci-red)]">{dict.restanteCount(restante.length)}</h3>
          <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
            {restante.map((a) => (
              <li key={a.id}>
                <CardActivitate a={a} compact />
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="ci-scrollbar overflow-x-auto pb-2">
        <div className="grid grid-cols-1 gap-2 md:min-w-[70rem] md:grid-cols-7">
          {zile.map((z, i) => {
            const ale = inSaptamana.filter((a) => a.termen === z);
            const weekend = i >= 5;
            return (
              <section key={z} aria-label={`${ZILE[i]} ${dataScurta(z, locale)}`} className={`rounded-[var(--ci-radius-card)] border p-2 ${z === azi ? "border-[var(--ci-primary)]" : "border-[var(--ci-border)]"} ${weekend ? "bg-[var(--ci-surface-2)]/60" : "bg-[var(--ci-surface)]"}`}>
                <h3 className="mb-2 flex items-baseline justify-between px-1 text-[12.5px] font-semibold text-[var(--ci-text)]">
                  {ZILE[i]}
                  <span className={`ci-tabular text-[12px] font-normal ${z === azi ? "font-semibold text-[var(--ci-primary)]" : "text-[var(--ci-text-muted)]"}`}>{dataScurta(z, locale)}</span>
                </h3>
                <ul className="space-y-2">
                  {ale.map((a) => (
                    <li key={a.id}>
                      <CardActivitate a={a} compact arataResponsabil />
                    </li>
                  ))}
                  {ale.length === 0 && <li className="px-1 py-3 text-center text-[11.5px] text-[var(--ci-text-muted)] max-md:hidden">—</li>}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
