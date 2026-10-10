"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Columns3, List, Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ETICHETE_PRIORITATE, ETICHETE_STATUS_ACT, type Prioritate, type StatusActivitate } from "@/lib/performanta-activitati-reguli";
import type { ActivitateDto } from "@/lib/performanta-activitati-tipuri";
import { ETICHETE_INCARCARE } from "@/lib/performanta-masurare";
import type { DateSaptamana } from "@/lib/performanta-pagini";

import { Button } from "../components/ui/button";
import { Input, Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { CardActivitate } from "./activitate-ui";
import { ActivitatiProvider, useActivitati } from "./activitati-context";
import { dataScurta } from "./ui-comune";

type Vedere = "lista" | "tabla" | "calendar";
const VEDERI: { id: Vedere; eticheta: string; Icon: typeof List }[] = [
  { id: "lista", eticheta: "Listă", Icon: List },
  { id: "tabla", eticheta: "Tablă", Icon: Columns3 },
  { id: "calendar", eticheta: "Calendar", Icon: CalendarDays },
];
const ZILE = ["Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă", "Duminică"];
const adauga = (iso: string, zile: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + zile * 86400000).toISOString().slice(0, 10);

export function SaptamanaClient({ orgSlug, d }: { orgSlug: string; d: DateSaptamana }) {
  return (
    <ActivitatiProvider orgSlug={orgSlug} optiuni={d.context.optiuni} obiective={d.context.obiective} dependente={d.context.dependente}>
      <Continut d={d} />
    </ActivitatiProvider>
  );
}

function Continut({ d }: { d: DateSaptamana }) {
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
  }, []);

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
    const f = (x: Date) => x.toLocaleDateString("ro-RO", { day: "numeric", month: "short", timeZone: "UTC" });
    return `${f(a)} – ${f(l)} ${l.getUTCFullYear()}`;
  }, [d.luni, d.duminica]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
            <button type="button" aria-label="Săptămâna anterioară" onClick={() => seteaza({ luni: adauga(d.luni, -7) })} className="rounded-l-[var(--ci-radius-btn)] p-2 text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
              <ChevronLeft className="size-4" aria-hidden />
            </button>
            <span className="ci-tabular min-w-[10.5rem] px-2 text-center text-[13px] font-semibold text-[var(--ci-text)]" aria-live="polite">
              {pozitie}
            </span>
            <button type="button" aria-label="Săptămâna următoare" onClick={() => seteaza({ luni: adauga(d.luni, 7) })} className="rounded-r-[var(--ci-radius-btn)] p-2 text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
              <ChevronRight className="size-4" aria-hidden />
            </button>
          </div>
          {!esteCurenta && (
            <Button size="sm" onClick={() => seteaza({ luni: null })}>
              Săptămâna aceasta
            </Button>
          )}
          <span className="text-[13px] text-[var(--ci-text-muted)]">
            {gata} din {total} finalizate
          </span>
        </div>
        <Button variant="primary" disabled={!optiuni.euAngajatId && !optiuni.admin} onClick={() => deschideForm(null, { termen: esteCurenta ? d.azi : d.luni })}>
          <Plus className="size-4" aria-hidden /> Activitate nouă
        </Button>
      </div>

      {d.capacitate && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-4 py-2.5 text-[13px]">
          <span className="font-semibold text-[var(--ci-text)]">{d.capacitate.nume}</span>
          <span className="ci-tabular text-[var(--ci-text-muted)]">
            {String(d.capacitate.incarcareOre).replace(".", ",")} h estimate din {String(d.capacitate.capacitateOre).replace(".", ",")} h disponibile
          </span>
          <span className="font-medium text-[var(--ci-text)]">{ETICHETE_INCARCARE[d.capacitate.nivel]}</span>
          {d.capacitate.zileAbsente > 0 && <span className="text-[var(--ci-text-muted)]">{d.capacitate.zileAbsente} zile de absență</span>}
          {d.capacitate.fara_estimare > 0 && <span className="text-[var(--ci-amber)]">{d.capacitate.fara_estimare} activități fără efort estimat nu intră în calcul</span>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Filtre activități">
        <div className="min-w-[12rem] flex-1 sm:max-w-xs">
          <Input aria-label="Caută activități" icon={<Search className="size-4" aria-hidden />} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Caută o activitate" />
        </div>
        <Select aria-label="Responsabil" className="!w-auto min-w-36" value={sp.get("resp") ?? ""} onChange={(e) => seteaza({ resp: e.target.value || null })}>
          <option value="">Toți</option>
          {optiuni.euAngajatId && <option value={optiuni.euAngajatId}>Ale mele</option>}
          {optiuni.angajati.filter((a) => a.id !== optiuni.euAngajatId).map((a) => (
            <option key={a.id} value={a.id}>
              {a.nume}
            </option>
          ))}
        </Select>
        <Select aria-label="Obiectiv" className="!w-auto min-w-36" value={sp.get("ob") ?? ""} onChange={(e) => seteaza({ ob: e.target.value || null })}>
          <option value="">Toate obiectivele</option>
          {d.context.obiective.map((o) => (
            <option key={o.id} value={o.id}>
              {o.titlu}
            </option>
          ))}
        </Select>
        <Select aria-label="Prioritate" className="!w-auto min-w-32" value={sp.get("prioritate") ?? ""} onChange={(e) => seteaza({ prioritate: e.target.value || null })}>
          <option value="">Orice prioritate</option>
          {(Object.keys(ETICHETE_PRIORITATE) as Prioritate[]).map((p) => (
            <option key={p} value={p}>
              {ETICHETE_PRIORITATE[p]}
            </option>
          ))}
        </Select>
        <Select aria-label="Stare" className="!w-auto min-w-32" value={sp.get("status") ?? ""} onChange={(e) => seteaza({ status: e.target.value || null })}>
          <option value="">Fără cele anulate</option>
          <option value="deschise">Doar deschise</option>
          {(Object.keys(ETICHETE_STATUS_ACT) as StatusActivitate[]).map((s) => (
            <option key={s} value={s}>
              {ETICHETE_STATUS_ACT[s]}
            </option>
          ))}
          <option value="toate">Toate</option>
        </Select>
        {filtreActive && (
          <Button variant="ghost" size="sm" onClick={() => { setQ(""); seteaza({ resp: null, ob: null, prioritate: null, status: null, q: null }); }}>
            Șterge filtrele
          </Button>
        )}
        <div role="group" aria-label="Vedere" className="ml-auto flex rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-0.5">
          {VEDERI.map(({ id, eticheta, Icon }) => (
            <button key={id} type="button" aria-pressed={vedere === id} onClick={() => seteaza({ vedere: id === "lista" ? null : id })} className={`inline-flex items-center gap-1.5 rounded-[calc(var(--ci-radius-btn)-2px)] px-2.5 py-1 text-[12.5px] font-medium focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${vedere === id ? "bg-[var(--ci-surface-2)] text-[var(--ci-text)]" : "text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]"}`}>
              <Icon className="size-4" aria-hidden />
              <span className="max-sm:sr-only">{eticheta}</span>
            </button>
          ))}
        </div>
      </div>

      <p role="status" aria-live="polite" className={mesaj ? `text-[13px] ${mesaj.eroare ? "rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[var(--ci-red)]" : "text-[var(--ci-green)]"}` : "sr-only"}>
        {mesaj?.text ?? ""}
      </p>

      {total === 0 && d.neplanificate.length === 0 ? (
        <EmptyState
          title={filtreActive ? "Nicio activitate nu se potrivește filtrelor" : "Nicio activitate în această săptămână"}
          description={filtreActive ? "Scoate un filtru sau schimbă săptămâna." : "Planifică ce trebuie făcut: fiecare activitate are un responsabil, un termen și, dacă vrei, un obiectiv."}
          action={!filtreActive ? <Button variant="primary" onClick={() => deschideForm(null, { termen: d.azi })}><Plus className="size-4" aria-hidden /> Adaugă prima activitate</Button> : undefined}
        />
      ) : vedere === "lista" ? (
        <div className="space-y-5">
          {restante.length > 0 && <Sectiune titlu="Restante" nota="Neterminate, cu termen înainte de această săptămână" activitati={restante} urgent />}
          {zile.map((z, i) => {
            const ale = inSaptamana.filter((a) => a.termen === z);
            return ale.length === 0 ? null : <Sectiune key={z} titlu={`${ZILE[i]}, ${dataScurta(z)}`} activitati={ale} azi={z === d.azi} />;
          })}
          {d.neplanificate.length > 0 && <Sectiune titlu="Fără termen" nota="Activități deschise pe care nu le-ai așezat încă în calendar" activitati={d.neplanificate} />}
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
  return (
    <section aria-label={titlu}>
      <h3 className="mb-2 flex flex-wrap items-baseline gap-2 text-[13.5px] font-semibold text-[var(--ci-text)]">
        <span className={urgent ? "text-[var(--ci-red)]" : ""}>{titlu}</span>
        {azi && <span className="rounded-full bg-[var(--ci-primary)] px-2 py-px text-[11px] font-medium text-white">Azi</span>}
        <span className="text-[12px] font-normal text-[var(--ci-text-muted)]">{nota ?? `${activitati.length} ${activitati.length === 1 ? "activitate" : "activități"}`}</span>
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

const COLOANE: { status: StatusActivitate; titlu: string }[] = [
  { status: "de_facut", titlu: "De făcut" },
  { status: "in_lucru", titlu: "În lucru" },
  { status: "in_asteptare", titlu: "În așteptare" },
  { status: "blocat", titlu: "Blocate" },
  { status: "finalizat", titlu: "Finalizate" },
];

function Tabla({ activitati }: { activitati: ActivitateDto[] }) {
  return (
    <div className="ci-scrollbar -mx-1 overflow-x-auto px-1 pb-2">
      <div className="grid min-w-[62rem] grid-cols-5 gap-3">
        {COLOANE.map((c) => {
          const ale = activitati.filter((a) => a.status === c.status);
          return (
            <section key={c.status} aria-label={c.titlu} className="rounded-[var(--ci-radius-card)] bg-[var(--ci-surface-2)] p-2.5">
              <h3 className="mb-2 flex items-center justify-between px-1 text-[13px] font-semibold text-[var(--ci-text)]">
                {c.titlu}
                <span className="ci-tabular rounded-full bg-[var(--ci-surface)] px-2 py-px text-[12px] font-medium text-[var(--ci-text-muted)]">{ale.length}</span>
              </h3>
              <ul className="space-y-2">
                {ale.map((a) => (
                  <li key={a.id}>
                    <CardActivitate a={a} compact />
                  </li>
                ))}
                {ale.length === 0 && <li className="px-1 py-4 text-center text-[12px] text-[var(--ci-text-muted)]">Nimic aici</li>}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="mt-2 text-[12px] text-[var(--ci-text-muted)]">Mută o activitate dintr-o coloană în alta din meniul ei sau cu butonul principal. „Blocată” se obține raportând un blocaj, cu motiv și termen de revenire.</p>
    </div>
  );
}

function Calendar({ zile, azi, restante, inSaptamana }: { zile: string[]; azi: string; restante: ActivitateDto[]; inSaptamana: ActivitateDto[] }) {
  return (
    <div className="space-y-3">
      {restante.length > 0 && (
        <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-red)]/30 bg-[var(--ci-red-soft)]/40 p-2.5">
          <h3 className="mb-2 px-1 text-[13px] font-semibold text-[var(--ci-red)]">Restante ({restante.length})</h3>
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
              <section key={z} aria-label={`${ZILE[i]} ${dataScurta(z)}`} className={`rounded-[var(--ci-radius-card)] border p-2 ${z === azi ? "border-[var(--ci-primary)]" : "border-[var(--ci-border)]"} ${weekend ? "bg-[var(--ci-surface-2)]/60" : "bg-[var(--ci-surface)]"}`}>
                <h3 className="mb-2 flex items-baseline justify-between px-1 text-[12.5px] font-semibold text-[var(--ci-text)]">
                  {ZILE[i]}
                  <span className={`ci-tabular text-[12px] font-normal ${z === azi ? "font-semibold text-[var(--ci-primary)]" : "text-[var(--ci-text-muted)]"}`}>{dataScurta(z)}</span>
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
