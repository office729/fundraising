"use client";

import { ChevronLeft, ChevronRight, LayoutGrid, Network, Rows3, Search, Table2, Trash2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import type { Locale } from "@/lib/i18n/config";
import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { PERFORMANTA_UI4_DICT } from "@/lib/i18n/dictionaries/performanta-ui-4";
import { valideazaAbsenta, type TipAbsenta } from "@/lib/performanta-activitati-reguli";
import type { MembruEchipa, SaptamanaCapacitate } from "@/lib/performanta-activitati-tipuri";
import type { NivelIncarcare } from "@/lib/performanta-masurare";

import { Avatar } from "../components/ui/avatar";
import { Button } from "../components/ui/button";
import { Input, Label, Select } from "../components/ui/input";
import { SidePanel } from "../components/ui/side-panel";
import { EmptyState } from "../components/ui/states";
import { useLocale } from "../lib/locale-context";
import { adaugaAbsentaAction, stergeAbsentaAction } from "./activitati-actions";
import { dataCompleta, dataScurta } from "./ui-comune";

type DateEchipa = { membri: MembruEchipa[]; luni: string[]; azi: string; euAngajatId: string | null; admin: boolean };
type Vedere = "tabel" | "carduri" | "organigrama" | "capacitate";

const VEDERI: { id: Vedere; Icon: typeof Table2 }[] = [
  { id: "tabel", Icon: Table2 },
  { id: "carduri", Icon: LayoutGrid },
  { id: "organigrama", Icon: Network },
  { id: "capacitate", Icon: Rows3 },
];

// Culoarea ajută, dar nivelul e mereu scris (text), ca să se înțeleagă și fără culori.
const CELULA: Record<NivelIncarcare, string> = {
  indisponibil: "bg-[var(--ci-surface-2)] text-[var(--ci-text-muted)]",
  liber: "bg-[var(--ci-blue-soft)] text-[var(--ci-blue)]",
  echilibrat: "bg-[var(--ci-green-soft)] text-[var(--ci-green)]",
  plin: "bg-[var(--ci-amber-soft)] text-[var(--ci-amber)]",
  suprasolicitat: "bg-[var(--ci-red-soft)] text-[var(--ci-red)]",
};
const h = (n: number, locale: Locale = "ro") => (locale === "ro" ? String(Math.round(n * 10) / 10).replace(".", ",") : String(Math.round(n * 10) / 10));
const adauga = (iso: string, zile: number) => new Date(Date.parse(`${iso}T12:00:00Z`) + zile * 86400000).toISOString().slice(0, 10);

export function EchipaClient({ orgSlug, d, departamente }: { orgSlug: string; d: DateEchipa; departamente: { id: string; nume: string }[] }) {
  const dict = PERFORMANTA_UI4_DICT[useLocale()].echipa;
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const vedere = (VEDERI.some((v) => v.id === sp.get("vedere")) ? sp.get("vedere") : "tabel") as Vedere;
  const [q, setQ] = useState(sp.get("q") ?? "");
  const [selectatId, setSelectatId] = useState<string | null>(null);

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

  const dep = sp.get("dep") ?? "";
  const arataInactivi = sp.get("inactivi") === "1";
  const lista = useMemo(() => {
    const cuv = q.trim().toLowerCase();
    return d.membri.filter((m) => (arataInactivi || m.status !== "inactiv") && (!dep || m.departmentId === dep) && (!cuv || m.nume.toLowerCase().includes(cuv) || (m.rol ?? "").toLowerCase().includes(cuv)));
  }, [d.membri, q, dep, arataInactivi]);
  const selectat = d.membri.find((m) => m.id === selectatId) ?? null;
  const mutaSaptamani = (n: number) => seteaza({ luni: adauga(d.luni[0], n * 7) });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2" role="search" aria-label={dict.filtre}>
        <div className="min-w-[12rem] flex-1 sm:max-w-xs">
          <Input aria-label={dict.cautaAria} icon={<Search className="size-4" aria-hidden />} value={q} onChange={(e) => setQ(e.target.value)} placeholder={dict.cautaPlaceholder} />
        </div>
        <Select aria-label={dict.departament} className="!w-auto min-w-40" value={dep} onChange={(e) => seteaza({ dep: e.target.value || null })}>
          <option value="">{dict.toateDepartamentele}</option>
          {departamente.map((x) => (
            <option key={x.id} value={x.id}>
              {x.nume}
            </option>
          ))}
        </Select>
        <label className="inline-flex cursor-pointer items-center gap-2 text-[13px] text-[var(--ci-text-muted)]">
          <input type="checkbox" className="size-4" checked={arataInactivi} onChange={(e) => seteaza({ inactivi: e.target.checked ? "1" : null })} />
          {dict.arataInactivi}
        </label>
        <div role="group" aria-label={dict.vedere} className="ml-auto flex rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-0.5">
          {VEDERI.map(({ id, Icon }) => (
            <button key={id} type="button" aria-pressed={vedere === id} onClick={() => seteaza({ vedere: id === "tabel" ? null : id })} className={`inline-flex items-center gap-1.5 rounded-[calc(var(--ci-radius-btn)-2px)] px-2.5 py-1 text-[12.5px] font-medium focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none ${vedere === id ? "bg-[var(--ci-surface-2)] text-[var(--ci-text)]" : "text-[var(--ci-text-muted)] hover:text-[var(--ci-text)]"}`}>
              <Icon className="size-4" aria-hidden />
              <span className="max-sm:sr-only">{dict.vederi[id]}</span>
            </button>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <EmptyState
          title={d.membri.length === 0 ? dict.faraProfiluriTitlu : dict.nimeniTitlu}
          description={d.membri.length === 0 ? dict.faraProfiluriDescriere : dict.nimeniDescriere}
          action={d.membri.length === 0 ? <Link href={`/${orgSlug}/crm/organizatie`} className="inline-flex h-9 items-center rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-3.5 text-sm font-medium text-white hover:bg-[var(--ci-primary-hover)]">{dict.mergiLa}</Link> : undefined}
        />
      ) : vedere === "tabel" ? (
        <Tabel membri={lista} onAlege={(m) => setSelectatId(m.id)} />
      ) : vedere === "carduri" ? (
        <Carduri membri={lista} onAlege={(m) => setSelectatId(m.id)} />
      ) : vedere === "organigrama" ? (
        <Organigrama membri={lista} onAlege={(m) => setSelectatId(m.id)} />
      ) : (
        <Capacitate membri={lista} luni={d.luni} azi={d.azi} onAlege={(m) => setSelectatId(m.id)} muta={mutaSaptamani} />
      )}

      <PanouPersoana orgSlug={orgSlug} m={selectat} luni={d.luni} onClose={() => setSelectatId(null)} />
    </div>
  );
}

function StareProfil({ status }: { status: string }) {
  const dict = PERFORMANTA_UI4_DICT[useLocale()].echipa;
  if (status === "activ") return null;
  return <span className="rounded-full bg-[var(--ci-surface-2)] px-2 py-px text-[11px] font-medium text-[var(--ci-text-muted)]">{dict.status[status] ?? dict.status.inactiv}</span>;
}

function Tabel({ membri, onAlege }: { membri: MembruEchipa[]; onAlege: (m: MembruEchipa) => void }) {
  const dict = PERFORMANTA_UI4_DICT[useLocale()].echipa;
  return (
    <div className="ci-scrollbar max-h-[70vh] overflow-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
      <table className="w-full min-w-[52rem] border-collapse text-[13px]">
        <thead className="sticky top-0 z-[1] bg-[var(--ci-surface-2)] text-left text-[12px] font-semibold text-[var(--ci-text-muted)]">
          <tr>
            <th scope="col" className="px-4 py-2">{dict.persoana}</th>
            <th scope="col" className="px-3 py-2">{dict.rol}</th>
            <th scope="col" className="px-3 py-2">{dict.departament}</th>
            <th scope="col" className="px-3 py-2">{dict.raporteazaLui}</th>
            <th scope="col" className="px-3 py-2 text-right">{dict.norma}</th>
            <th scope="col" className="px-3 py-2 text-right">{dict.deschise}</th>
            <th scope="col" className="px-3 py-2 text-right">{dict.blocate}</th>
            <th scope="col" className="px-3 py-2 text-right">{dict.pesteTermen}</th>
            <th scope="col" className="px-3 py-2 text-right">{dict.obiectiveConduse}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--ci-border)]">
          {membri.map((m) => (
            <tr key={m.id} className="hover:bg-[var(--ci-surface-2)]/60">
              <th scope="row" className="px-4 py-2 text-left font-normal">
                <button type="button" onClick={() => onAlege(m)} className="flex items-center gap-2 text-left font-semibold text-[var(--ci-text)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
                  <Avatar name={m.nume} size="sm" />
                  {m.nume}
                  <StareProfil status={m.status} />
                </button>
              </th>
              <td className="px-3 py-2 text-[var(--ci-text-muted)]">{m.rol ?? "—"}</td>
              <td className="px-3 py-2 text-[var(--ci-text-muted)]">{m.departmentNume ?? "—"}</td>
              <td className="px-3 py-2 text-[var(--ci-text-muted)]">{m.managerNume ?? "—"}</td>
              <td className="ci-tabular px-3 py-2 text-right text-[var(--ci-text-muted)]">{m.vedeDetalii ? `${m.normaProcent}%` : "—"}</td>
              <td className="ci-tabular px-3 py-2 text-right">{m.vedeDetalii ? m.deschise : "—"}</td>
              <td className="ci-tabular px-3 py-2 text-right">{m.vedeDetalii ? m.blocate : "—"}</td>
              <td className="ci-tabular px-3 py-2 text-right">{m.vedeDetalii ? m.intarziate : "—"}</td>
              <td className="ci-tabular px-3 py-2 text-right">{m.vedeDetalii ? m.obiectiveResponsabil : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-[var(--ci-border)] px-4 py-2 text-[12px] text-[var(--ci-text-muted)]">{dict.notaTabel}</p>
    </div>
  );
}

function Carduri({ membri, onAlege }: { membri: MembruEchipa[]; onAlege: (m: MembruEchipa) => void }) {
  const dict = PERFORMANTA_UI4_DICT[useLocale()].echipa;
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {membri.map((m) => (
        <li key={m.id}>
          <button type="button" onClick={() => onAlege(m)} className="block w-full rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4 text-left transition-colors hover:border-[var(--ci-border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            <div className="flex items-center gap-3">
              <Avatar name={m.nume} size="md" />
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-[var(--ci-text)]">
                  {m.nume} <StareProfil status={m.status} />
                </p>
                <p className="truncate text-[12.5px] text-[var(--ci-text-muted)]">{[m.rol, m.departmentNume].filter(Boolean).join(" · ") || dict.faraRol}</p>
              </div>
            </div>
            {m.vedeDetalii ? (
              <dl className="ci-tabular mt-3 grid grid-cols-4 gap-2 text-center text-[12px]">
                {[
                  [dict.deschise, m.deschise],
                  [dict.blocate, m.blocate],
                  [dict.pesteTermen, m.intarziate],
                  [dict.obiective, m.obiectiveResponsabil],
                ].map(([e, v]) => (
                  <div key={e as string} className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] px-1 py-1.5">
                    <dd className="text-[15px] font-semibold text-[var(--ci-text)]">{v}</dd>
                    <dt className="text-[11px] text-[var(--ci-text-muted)]">{e}</dt>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-3 text-[12px] text-[var(--ci-text-muted)]">{dict.faraDetalii}</p>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Organigrama({ membri, onAlege }: { membri: MembruEchipa[]; onAlege: (m: MembruEchipa) => void }) {
  const dict = PERFORMANTA_UI4_DICT[useLocale()].echipa;
  const ids = new Set(membri.map((m) => m.id));
  const copii = new Map<string, MembruEchipa[]>();
  const radacini: MembruEchipa[] = [];
  for (const m of membri) {
    if (m.managerId && ids.has(m.managerId) && m.managerId !== m.id) copii.set(m.managerId, [...(copii.get(m.managerId) ?? []), m]);
    else radacini.push(m);
  }
  // Un ciclu de manageri (A raportează lui B, B lui A) ar ascunde persoanele din arbore: le arătăm separat, fără să blocăm pagina.
  const afisati = new Set<string>();
  const nod = (m: MembruEchipa, adancime: number): React.ReactNode => {
    if (afisati.has(m.id)) return null;
    afisati.add(m.id);
    const fii = copii.get(m.id) ?? [];
    return (
      <li key={m.id} className={adancime > 0 ? "relative pl-5 before:absolute before:top-0 before:bottom-0 before:left-0 before:w-px before:bg-[var(--ci-border)] last:before:h-5 after:absolute after:top-5 after:left-0 after:h-px after:w-4 after:bg-[var(--ci-border)]" : ""}>
        <button type="button" onClick={() => onAlege(m)} className="my-1 flex items-center gap-2.5 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-2 text-left hover:border-[var(--ci-border-strong)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
          <Avatar name={m.nume} size="sm" />
          <span>
            <span className="block text-[13.5px] font-semibold text-[var(--ci-text)]">{m.nume}</span>
            <span className="block text-[12px] text-[var(--ci-text-muted)]">{[m.rol, m.departmentNume].filter(Boolean).join(" · ") || dict.faraRol}</span>
          </span>
          <StareProfil status={m.status} />
        </button>
        {fii.length > 0 && <ul className="ml-4">{fii.map((f) => nod(f, adancime + 1))}</ul>}
      </li>
    );
  };
  const arbore = radacini.map((r) => nod(r, 0));
  const ramase = membri.filter((m) => !afisati.has(m.id));
  return (
    <div>
      <ul>{arbore}</ul>
      {ramase.length > 0 && (
        <div className="mt-4 rounded-[var(--ci-radius-btn)] bg-[var(--ci-amber-soft)] p-3 text-[13px] text-[var(--ci-amber)]">
          {dict.ciclu(ramase.map((m) => m.nume).join(", "))}
        </div>
      )}
    </div>
  );
}

function Capacitate({ membri, luni, azi, onAlege, muta }: { membri: MembruEchipa[]; luni: string[]; azi: string; onAlege: (m: MembruEchipa) => void; muta: (n: number) => void }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI4_DICT[locale].echipa;
  const comune = PERFORMANTA_UI_DICT[locale].comune;
  const luniCurenta = luni.find((l) => azi >= l && azi <= adauga(l, 6));
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-[13px] text-[var(--ci-text-muted)]">
          {dict.capacitateIntro}
        </p>
        <div className="flex items-center rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
          <button type="button" aria-label={dict.saptamanaInUrma} onClick={() => muta(-1)} className="rounded-l-[var(--ci-radius-btn)] p-2 text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            <ChevronLeft className="size-4" aria-hidden />
          </button>
          <button type="button" aria-label={dict.saptamanaInainte} onClick={() => muta(1)} className="rounded-r-[var(--ci-radius-btn)] p-2 text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
            <ChevronRight className="size-4" aria-hidden />
          </button>
        </div>
      </div>
      <div className="ci-scrollbar overflow-x-auto rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
        <table className="w-full min-w-[46rem] border-collapse text-[12.5px]">
          <thead className="bg-[var(--ci-surface-2)] text-left text-[12px] font-semibold text-[var(--ci-text-muted)]">
            <tr>
              <th scope="col" className="sticky left-0 bg-[var(--ci-surface-2)] px-4 py-2">{dict.persoana}</th>
              {luni.map((l) => (
                <th key={l} scope="col" className={`px-2 py-2 text-center ${l === luniCurenta ? "text-[var(--ci-primary)]" : ""}`}>
                  {dataScurta(l, locale)}
                  {l === luniCurenta && <span className="block text-[10.5px] font-medium">{dict.acum}</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ci-border)]">
            {membri.map((m) => (
              <tr key={m.id}>
                <th scope="row" className="sticky left-0 bg-[var(--ci-surface)] px-4 py-2 text-left font-normal">
                  <button type="button" onClick={() => onAlege(m)} className="font-semibold text-[var(--ci-text)] hover:underline focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none">
                    {m.nume}
                  </button>
                </th>
                {m.vedeDetalii
                  ? m.saptamani.map((s) => (
                      <td key={s.luni} className="p-1">
                        <Celula s={s} />
                      </td>
                    ))
                  : luni.map((l) => (
                      <td key={l} className="px-2 py-2 text-center text-[var(--ci-text-faint)]">
                        —
                      </td>
                    ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[var(--ci-text-muted)]" aria-label={dict.legenda}>
        {(Object.keys(comune.incarcare) as NivelIncarcare[]).map((n) => (
          <li key={n} className="flex items-center gap-1.5">
            <span className={`inline-block size-3 rounded ${CELULA[n].split(" ")[0]} ring-1 ring-[var(--ci-border)]`} aria-hidden />
            {comune.incarcare[n]}
            <span className="text-[var(--ci-text-faint)]">{dict.praguri[n]}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Celula({ s }: { s: SaptamanaCapacitate }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI4_DICT[locale].echipa;
  const comune = PERFORMANTA_UI_DICT[locale].comune;
  return (
    <div className={`rounded-[var(--ci-radius-btn)] px-2 py-1.5 text-center ${CELULA[s.nivel]}`} title={dict.celula(s.nrActivitati, s.zileAbsente, s.fara_estimare)}>
      <span className="ci-tabular block text-[12.5px] font-semibold">
        {h(s.incarcareOre, locale)}/{h(s.capacitateOre, locale)} h
      </span>
      <span className="block text-[11px]">{comune.incarcare[s.nivel]}</span>
    </div>
  );
}

function PanouPersoana({ orgSlug, m, luni, onClose }: { orgSlug: string; m: MembruEchipa | null; luni: string[]; onClose: () => void }) {
  const dict = PERFORMANTA_UI4_DICT[useLocale()].echipa;
  return (
    <SidePanel open={!!m} onClose={onClose} title={m?.nume ?? dict.persoanaImplicit} subtitle={m ? [m.rol, m.departmentNume].filter(Boolean).join(" · ") || undefined : undefined}>
      {m && <ContinutPersoana key={m.id} orgSlug={orgSlug} m={m} luni={luni} />}
    </SidePanel>
  );
}

function ContinutPersoana({ orgSlug, m, luni }: { orgSlug: string; m: MembruEchipa; luni: string[] }) {
  const locale = useLocale();
  const dict = PERFORMANTA_UI4_DICT[locale].echipa;
  const comune = PERFORMANTA_UI_DICT[locale].comune;
  const router = useRouter();
  const [tip, setTip] = useState<TipAbsenta>("concediu");
  const [start, setStart] = useState("");
  const [sfarsit, setSfarsit] = useState("");
  const [nota, setNota] = useState("");
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, tr] = useTransition();
  const poateAdauga = m.vedeDetalii;

  function adaugaAbsenta() {
    const input = { angajatId: m.id, tip, dataStart: start, dataSfarsit: sfarsit || start, nota };
    const e = valideazaAbsenta(input);
    if (e) return setEroare(e);
    setEroare(null);
    tr(async () => {
      const r = await adaugaAbsentaAction(orgSlug, input);
      if (!r.ok) return setEroare(r.eroare);
      setStart("");
      setSfarsit("");
      setNota("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[13px]">
        <div>
          <dt className="text-[12px] text-[var(--ci-text-muted)]">{dict.raporteazaLui}</dt>
          <dd className="mt-0.5 font-medium text-[var(--ci-text)]">{m.managerNume ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-[var(--ci-text-muted)]">{dict.norma}</dt>
          <dd className="mt-0.5 font-medium text-[var(--ci-text)]">{m.vedeDetalii ? `${m.normaProcent}%` : "—"}</dd>
        </div>
        {m.email && (
          <div className="col-span-2">
            <dt className="text-[12px] text-[var(--ci-text-muted)]">{dict.email}</dt>
            <dd className="mt-0.5 font-medium break-all text-[var(--ci-text)]">{m.email}</dd>
          </div>
        )}
      </dl>

      {m.vedeDetalii ? (
        <>
          <section aria-labelledby="cap-t">
            <h3 id="cap-t" className="ci-display mb-2 text-[14px] font-semibold text-[var(--ci-text)]">{dict.incarcarePeSaptamani}</h3>
            <ul className="space-y-1.5">
              {m.saptamani.map((s, i) => (
                <li key={s.luni} className="flex items-center justify-between gap-2 text-[13px]">
                  <span className="text-[var(--ci-text-muted)]">{dict.saptamanaDin(dataScurta(luni[i], locale))}</span>
                  <span className={`ci-tabular rounded-full px-2 py-0.5 text-[12px] font-medium ${CELULA[s.nivel]}`}>
                    {h(s.incarcareOre, locale)}/{h(s.capacitateOre, locale)} h · {comune.incarcare[s.nivel]}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="abs-t">
            <h3 id="abs-t" className="ci-display mb-2 text-[14px] font-semibold text-[var(--ci-text)]">{dict.absente}</h3>
            {m.absente.length === 0 ? (
              <p className="text-[13px] text-[var(--ci-text-muted)]">{dict.faraAbsente}</p>
            ) : (
              <ul className="space-y-1.5">
                {m.absente.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-3 py-1.5 text-[13px]">
                    <span>
                      <strong className="font-medium text-[var(--ci-text)]">{comune.absenta[a.tip]}</strong> <span className="text-[var(--ci-text-muted)]">· {dataCompleta(a.dataStart, locale)}{a.dataSfarsit !== a.dataStart && ` – ${dataCompleta(a.dataSfarsit, locale)}`}</span>
                      {a.nota && <span className="block text-[12px] text-[var(--ci-text-muted)]">{a.nota}</span>}
                    </span>
                    {a.poateSterge && (
                      <Button size="icon" variant="ghost" aria-label={dict.stergeAbsenta} onClick={() => tr(async () => { await stergeAbsentaAction(orgSlug, a.id); router.refresh(); })}>
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {poateAdauga && (
              <form
                noValidate
                className="mt-3 grid gap-2 rounded-[var(--ci-radius-card)] bg-[var(--ci-surface-2)] p-3 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  adaugaAbsenta();
                }}
              >
                <p className="text-[12.5px] font-medium text-[var(--ci-text)] sm:col-span-2">{dict.adaugaAbsenta}</p>
                <div>
                  <Label htmlFor="ab-tip">{dict.tip}</Label>
                  <Select id="ab-tip" value={tip} onChange={(e) => setTip(e.target.value as TipAbsenta)}>
                    {Object.keys(comune.absenta).map((t) => (
                      <option key={t} value={t}>
                        {comune.absenta[t]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="ab-nota">{dict.nota}</Label>
                  <Input id="ab-nota" maxLength={300} value={nota} onChange={(e) => setNota(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="ab-start">{dict.deLa}</Label>
                  <Input id="ab-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="ab-end">{dict.panaLa}</Label>
                  <Input id="ab-end" type="date" min={start} value={sfarsit} onChange={(e) => setSfarsit(e.target.value)} />
                </div>
                {eroare && (
                  <p role="alert" className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-red-soft)] px-3 py-2 text-[12.5px] text-[var(--ci-red)] sm:col-span-2">
                    {eroare}
                  </p>
                )}
                <div className="sm:col-span-2">
                  <Button type="submit" variant="primary" size="sm" loading={pending}>
                    {dict.adauga}
                  </Button>
                </div>
              </form>
            )}
          </section>
        </>
      ) : (
        <p className="rounded-[var(--ci-radius-btn)] bg-[var(--ci-surface-2)] p-3 text-[13px] text-[var(--ci-text-muted)]">{dict.faraAcces}</p>
      )}
      <Link href={`/${orgSlug}/crm/organizatie`} className="inline-block text-[12.5px] font-medium text-[var(--ci-blue)] hover:underline">
        {dict.editeazaProfilul}
      </Link>
    </div>
  );
}
