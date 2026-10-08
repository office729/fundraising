"use client";

import { ChevronDown, Settings } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Input, Label, Select } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { DONATORI_REALI_DICT } from "@/lib/i18n/dictionaries/donatori-reali";
import { numarFiltreActiveDonatori, parseFiltruDonatoriReali } from "./lib/filters";

const CAMPURI = ["judet", "localitate", "sumaMin", "sumaMax", "proiect", "pentruCine", "dataDe", "dataPana", "primaDe", "primaPana"] as const;

export function FilterBarReali({ campanii }: { campanii: { id: string; titlu: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const dict = DONATORI_REALI_DICT[locale].filterBar;
  const f = parseFiltruDonatoriReali(searchParams);
  const [q, setQ] = useState(f.q);
  const [extins, setExtins] = useState(numarFiltreActiveDonatori(f) > 0);
  const [v, setV] = useState<Record<(typeof CAMPURI)[number], string>>({
    judet: f.judet,
    localitate: f.localitate,
    sumaMin: f.sumaMin != null ? String(f.sumaMin) : "",
    sumaMax: f.sumaMax != null ? String(f.sumaMax) : "",
    proiect: f.proiect,
    pentruCine: f.pentruCine,
    dataDe: f.dataDe,
    dataPana: f.dataPana,
    primaDe: f.primaDe,
    primaPana: f.primaPana,
  });
  const active = numarFiltreActiveDonatori(f);

  function push(next: Record<string, string | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, val] of Object.entries(next)) {
      if (val === null || val === "") sp.delete(k);
      else sp.set(k, val);
    }
    sp.delete("pagina");
    router.push(`${pathname}?${sp.toString()}`);
  }

  const aplica = () => push({ q: q.trim() || null, ...Object.fromEntries(CAMPURI.map((k) => [k, v[k].trim() || null])) });
  const reseteaza = () => {
    setV({ judet: "", localitate: "", sumaMin: "", sumaMax: "", proiect: "", pentruCine: "", dataDe: "", dataPana: "", primaDe: "", primaPana: "" });
    push(Object.fromEntries(CAMPURI.map((k) => [k, null])));
  };
  const set = (k: (typeof CAMPURI)[number], val: string) => setV((p) => ({ ...p, [k]: val }));
  const data = "h-9 w-full rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 text-[13px] text-[var(--ci-text)]";

  return (
    <form
      className="space-y-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3.5"
      onSubmit={(e) => {
        e.preventDefault();
        aplica();
      }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={dict.cautaPlaceholder} className="h-9 w-full sm:w-72" />
        <button type="submit" className="h-9 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90">
          {dict.cauta}
        </button>
        <button
          type="button"
          onClick={() => setExtins((x) => !x)}
          aria-expanded={extins}
          className="ml-auto flex items-center gap-1.5 rounded-[var(--ci-radius-btn)] px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
        >
          <Settings className="h-4 w-4" /> Filtre
          {active > 0 && <span className="ci-tabular rounded-full bg-[var(--ci-primary-soft)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ci-primary)]">{active}</span>}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${extins ? "rotate-180" : ""}`} />
        </button>
      </div>

      {extins && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label>Județ</Label>
              <Input value={v.judet} onChange={(e) => set("judet", e.target.value)} placeholder="ex. Cluj" className="h-9" />
            </div>
            <div>
              <Label>Localitate</Label>
              <Input value={v.localitate} onChange={(e) => set("localitate", e.target.value)} placeholder="ex. Frumușica" className="h-9" />
            </div>
            <div>
              <Label>Suma donată (lei) — de la</Label>
              <Input type="number" min="0" value={v.sumaMin} onChange={(e) => set("sumaMin", e.target.value)} className="h-9" />
            </div>
            <div>
              <Label>Suma donată (lei) — până la</Label>
              <Input type="number" min="0" value={v.sumaMax} onChange={(e) => set("sumaMax", e.target.value)} className="h-9" />
            </div>
            <div>
              <Label>Proiect / campanie</Label>
              <Select value={v.proiect} onChange={(e) => set("proiect", e.target.value)} className="h-9 w-full text-[13px]">
                <option value="">Toate campaniile</option>
                {campanii.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.titlu}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Pentru cine a donat</Label>
              <Input value={v.pentruCine} onChange={(e) => set("pentruCine", e.target.value)} placeholder="nume beneficiar" className="h-9" />
            </div>
            <div>
              <Label>Data donației — de la</Label>
              <input type="date" value={v.dataDe} onChange={(e) => set("dataDe", e.target.value)} className={data} />
            </div>
            <div>
              <Label>Data donației — până la</Label>
              <input type="date" value={v.dataPana} onChange={(e) => set("dataPana", e.target.value)} className={data} />
            </div>
            <div>
              <Label>Prima donație — de la</Label>
              <input type="date" value={v.primaDe} onChange={(e) => set("primaDe", e.target.value)} className={data} />
            </div>
            <div>
              <Label>Prima donație — până la</Label>
              <input type="date" value={v.primaPana} onChange={(e) => set("primaPana", e.target.value)} className={data} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 border-t border-[var(--ci-border)] pt-3">
            <button type="submit" className="h-9 rounded-[var(--ci-radius-btn)] bg-[var(--ci-primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90">
              Aplică filtrele
            </button>
            {active > 0 && (
              <button type="button" onClick={reseteaza} className="h-9 rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-4 text-[13px] font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
                Șterge filtrele
              </button>
            )}
          </div>
        </>
      )}
    </form>
  );
}