"use client";

import { GanttChart, ListTree, Network, Plus, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { PERFORMANTA_UI3_DICT } from "@/lib/i18n/dictionaries/performanta-ui-3";
import type { StareRitm } from "@/lib/performanta-masurare";
import type { ObiectivDto, OptiuniPerformanta } from "@/lib/performanta-tipuri";

import { Button } from "../components/ui/button";
import { Input, Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { useLocale } from "../lib/locale-context";
import { DetaliuObiectiv } from "./obiectiv-detaliu";
import { ObiectivForm } from "./obiectiv-form";
import type { SablonEfectiv } from "@/lib/performanta-sabloane";
import { SablonDialog } from "./sablon-dialog";
import { VedereArbore, VedereCronologie, VedereLista } from "./obiective-vederi";
import { SelectorPerioada } from "./perf-nav";
import { StareBadge } from "./ui-comune";

type Vedere = "lista" | "arbore" | "cronologie";
type Sortare = "implicit" | "risc" | "progres" | "termen";

const VEDERI: { id: Vedere; Icon: typeof ListTree }[] = [
  { id: "lista", Icon: ListTree },
  { id: "arbore", Icon: Network },
  { id: "cronologie", Icon: GanttChart },
];

const SEVERITATE: Record<StareRitm, number> = { intarziat: 0, in_risc: 1, fara_date: 2, neinceput: 3, in_grafic: 4, finalizat: 5, anulat: 6 };

export function ObiectiveClient({ orgSlug, sabloane, obiective, optiuni, perioada, azi }: { orgSlug: string; sabloane: SablonEfectiv[]; obiective: ObiectivDto[]; optiuni: OptiuniPerformanta; perioada: { start: string; end: string; cod: string }; azi: string }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI3_DICT[locale].client;
  const comune = PERFORMANTA_UI_DICT[locale].comune;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const vedere = (["lista", "arbore", "cronologie"].includes(sp.get("vedere") ?? "") ? sp.get("vedere") : "lista") as Vedere;
  const sortare = (["risc", "progres", "termen"].includes(sp.get("sortare") ?? "") ? sp.get("sortare") : "implicit") as Sortare;
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [selectatId, setSelectatId] = useState<string | null>(sp.get("ob"));
  const [formDeschis, setFormDeschis] = useState(false);
  const [editat, setEditat] = useState<ObiectivDto | null>(null);
  const [mesaj, setMesaj] = useState<string | null>(null);
  const [sablon, setSablon] = useState(false);

  const seteaza = (patch: Record<string, string | null>) => {
    const n = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) n.set(k, v);
      else n.delete(k);
    }
    router.replace(n.toString() ? `${pathname}?${n.toString()}` : pathname, { scroll: false });
  };

  // „+ Adaugă” din antet trimite aici cu ?nou=obiectiv (și când ești deja pe pagină): formularul se deschide, apoi adresa se curăță.
  const cerut = sp.get("nou");
  useEffect(() => {
    if (!cerut) return;
    if (cerut === "obiectiv") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditat(null);
      setFormDeschis(true);
    }
    seteaza({ nou: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cerut]);

  // Căutarea intră în adresă după o scurtă pauză, ca să nu reîncarcăm la fiecare literă.
  useEffect(() => {
    if ((sp.get("q") ?? "") === q.trim()) return;
    const t = setTimeout(() => seteaza({ q: q.trim() || null }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const lista = useMemo(() => {
    const l = [...obiective];
    if (sortare === "risc") l.sort((a, b) => SEVERITATE[a.stare] - SEVERITATE[b.stare] || (a.progres ?? 9) - (b.progres ?? 9));
    else if (sortare === "progres") l.sort((a, b) => (a.progres ?? -1) - (b.progres ?? -1));
    else if (sortare === "termen") l.sort((a, b) => (a.perioadaEnd < b.perioadaEnd ? -1 : a.perioadaEnd > b.perioadaEnd ? 1 : 0));
    return l;
  }, [obiective, sortare]);

  const selectat = obiective.find((o) => o.id === selectatId) ?? null;
  const activ = obiective.filter((o) => o.status === "activ");
  const numara = (st: StareRitm[]) => activ.filter((o) => st.includes(o.stare)).length;
  const sumar: { eticheta: string; n: number; stare?: StareRitm }[] = [
    { eticheta: dict.obiectiveActive, n: activ.length },
    { eticheta: "in_grafic", n: numara(["in_grafic", "finalizat"]), stare: "in_grafic" },
    { eticheta: "in_risc", n: numara(["in_risc"]), stare: "in_risc" },
    { eticheta: "intarziat", n: numara(["intarziat"]), stare: "intarziat" },
    { eticheta: "fara_date", n: numara(["fara_date", "neinceput"]), stare: "fara_date" },
  ];

  const filtreActive = ["dep", "resp", "nivel", "status", "q"].some((k) => sp.get(k));
  const poateCrea = optiuni.admin || optiuni.euAngajatId !== null;

  function dupaSalvare(id: string) {
    setFormDeschis(false);
    setEditat(null);
    setMesaj(dict.obiectivSalvat);
    router.refresh();
    setSelectatId(id);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SelectorPerioada />
        <div className="flex flex-wrap gap-2">
        <Button disabled={!poateCrea} onClick={() => setSablon(true)}>
          {dict.dinSablon}
        </Button>
        <Button
          variant="primary"
          disabled={!poateCrea}
          title={poateCrea ? undefined : dict.aiNevoieProfil}
          onClick={() => {
            setEditat(null);
            setFormDeschis(true);
          }}
        >
          <Plus className="size-4" aria-hidden /> {dict.obiectivNou}
        </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {sumar.map((s) => (
          <div key={s.eticheta} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3.5 py-3">
            <p className="ci-display ci-tabular text-xl font-bold text-[var(--ci-text)]">{s.n}</p>
            <div className="mt-0.5 flex items-center gap-1.5">{s.stare ? <StareBadge stare={s.stare} className="!px-0 !py-0 !bg-transparent" /> : <span className="text-[12px] text-[var(--ci-text-muted)]">{s.eticheta}</span>}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="search" aria-label={dict.filtre}>
        <div className="min-w-[12rem] flex-1 sm:max-w-xs">
          <Input aria-label={dict.cautaAria} icon={<Search className="size-4" aria-hidden />} value={q} onChange={(e) => setQ(e.target.value)} placeholder={dict.cautaPlaceholder} />
        </div>
        <Select aria-label={dict.departament} className="!w-auto min-w-36" value={sp.get("dep") ?? ""} onChange={(e) => seteaza({ dep: e.target.value || null })}>
          <option value="">{dict.toateDepartamentele}</option>
          {optiuni.departamente.map((d) => (
            <option key={d.id} value={d.id}>
              {d.nume}
            </option>
          ))}
        </Select>
        <Select aria-label={dict.responsabil} className="!w-auto min-w-36" value={sp.get("resp") ?? ""} onChange={(e) => seteaza({ resp: e.target.value || null })}>
          <option value="">{dict.totiResponsabilii}</option>
          {optiuni.euAngajatId && <option value={optiuni.euAngajatId}>{dict.aleMele}</option>}
          {optiuni.angajati
            .filter((a) => a.id !== optiuni.euAngajatId)
            .map((a) => (
              <option key={a.id} value={a.id}>
                {a.nume}
              </option>
            ))}
        </Select>
        <Select aria-label={dict.nivel} className="!w-auto min-w-32" value={sp.get("nivel") ?? ""} onChange={(e) => seteaza({ nivel: e.target.value || null })}>
          <option value="">{dict.toateNivelurile}</option>
          {Object.keys(comune.nivel).map((n) => (
            <option key={n} value={n}>
              {comune.nivel[n]}
            </option>
          ))}
        </Select>
        <Select aria-label={dict.stare} className="!w-auto min-w-32" value={sp.get("status") ?? ""} onChange={(e) => seteaza({ status: e.target.value || null })}>
          <option value="">{dict.activeSiFinalizate}</option>
          <option value="activ">{dict.doarActive}</option>
          <option value="finalizat">{dict.finalizate}</option>
          <option value="anulat">{dict.anulate}</option>
          <option value="toate">{dict.toate}</option>
        </Select>
        <Select aria-label={dict.sortare} className="!w-auto min-w-36" value={sortare} onChange={(e) => seteaza({ sortare: e.target.value === "implicit" ? null : e.target.value })}>
          <option value="implicit">{dict.ordineImplicita}</option>
          <option value="risc">{dict.celeMaiLaRisc}</option>
          <option value="progres">{dict.celMaiMicProgres}</option>
          <option value="termen">{dict.dupaSfarsit}</option>
        </Select>
        {filtreActive && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              seteaza({ dep: null, resp: null, nivel: null, status: null, q: null });
            }}
          >
            {dict.stergeFiltrele}
          </Button>
        )}
        <div role="group" aria-label={dict.vedere} className="ml-auto flex rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-0.5">
          {VEDERI.map(({ id, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={vedere === id}
              onClick={() => seteaza({ vedere: id === "lista" ? null : id })}
              className={`inline-flex items-center gap-1.5 rounded-[calc(var(--ci-radius-btn)-2px)] px-2.5 py-1 text-[12.5px] font-medium focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${vedere === id ? "bg-[var(--ci-surface-2)] text-[var(--ci-text)]" : "text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]"}`}
            >
              <Icon className="size-4" aria-hidden />
              <span className="max-sm:sr-only">{dict.vederi[id]}</span>
            </button>
          ))}
        </div>
      </div>

      <p role="status" aria-live="polite" className={mesaj ? "text-[13px] text-[var(--ci-green)]" : "sr-only"}>
        {mesaj ?? ""}
      </p>

      {lista.length === 0 ? (
        <EmptyState
          title={filtreActive ? dict.golFiltrateTitlu : dict.golTitlu}
          description={filtreActive ? dict.golFiltrateDescriere : dict.golDescriere}
          action={
            poateCrea && !filtreActive ? (
              <Button variant="primary" onClick={() => setFormDeschis(true)}>
                <Plus className="size-4" aria-hidden /> {dict.creeazaPrimul}
              </Button>
            ) : undefined
          }
        />
      ) : vedere === "lista" ? (
        <VedereLista obiective={lista} azi={azi} onDeschide={(o) => setSelectatId(o.id)} />
      ) : vedere === "arbore" ? (
        <VedereArbore obiective={lista} azi={azi} onDeschide={(o) => setSelectatId(o.id)} />
      ) : (
        <VedereCronologie obiective={lista} azi={azi} perioada={perioada} onDeschide={(o) => setSelectatId(o.id)} />
      )}

      <DetaliuObiectiv
        orgSlug={orgSlug}
        obiectiv={selectat}
        azi={azi}
        onClose={() => setSelectatId(null)}
        onEditeaza={(o) => {
          setEditat(o);
          setFormDeschis(true);
        }}
        onSchimbat={() => {
          setMesaj(dict.modificareSalvata);
          router.refresh();
        }}
      />
      {sablon && <SablonDialog orgSlug={orgSlug} sabloane={sabloane} optiuni={optiuni} perioada={perioada} onClose={() => setSablon(false)} onGata={(t) => { setSablon(false); setMesaj(t); router.refresh(); }} />}
      <ObiectivForm
        orgSlug={orgSlug}
        open={formDeschis}
        onClose={() => {
          setFormDeschis(false);
          setEditat(null);
        }}
        editat={editat}
        optiuni={optiuni}
        perioada={perioada}
        onSalvat={dupaSalvare}
      />
    </div>
  );
}
