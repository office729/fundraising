"use client";

import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Input, Select } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";
import { COMPANII_DICT } from "@/lib/i18n/dictionaries/companii";
import { JUDETE, parseFiltru, type PerioadaTip } from "./lib/filters";

const PERIOADA_KEYS = ["toate", "q1", "q2", "q3", "q4", "an", "luna", "saptamana"] as const satisfies readonly PerioadaTip[];

const ANI = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - 2 + i);

function pill(activ: boolean) {
  return `rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
    activ
      ? "border-[var(--ci-primary)] bg-[var(--ci-primary-soft)] text-[var(--ci-primary)]"
      : "border-[var(--ci-border)] text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]"
  }`;
}

export function FilterBar({ responsabili }: { responsabili: { id: string; name: string | null }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = useLocale();
  const dict = COMPANII_DICT[locale].filterBar;
  const f = parseFiltru(searchParams);
  const [q, setQ] = useState(f.q);
  const [dataStart, setDataStart] = useState(f.dataStart);
  const [dataSfarsit, setDataSfarsit] = useState(f.dataSfarsit);

  // Rândurile de filtre detaliate ocupă mult spațiu pe verticală — se restrâng
  // implicit (doar căutarea rapidă rămâne mereu vizibilă) și se deschid automat
  // dacă un filtru e deja activ, ca omul să nu creadă că nu mai există filtrul
  // aplicat doar pentru că panoul e restrâns.
  const filtreActive =
    (f.perioadaTip !== "toate" ? 1 : 0) +
    (f.responsabil !== "toti" ? 1 : 0) +
    (f.judet !== "toate" ? 1 : 0) +
    (f.contact !== "toate" ? 1 : 0) +
    f.marcaje.length +
    (f.vezi !== "toata" ? 1 : 0);
  const [extins, setExtins] = useState(filtreActive > 0);

  function push(next: Record<string, string | string[] | null>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      sp.delete(k);
      if (v == null) continue;
      if (Array.isArray(v)) v.forEach((val) => sp.append(k, val));
      else sp.set(k, v);
    }
    sp.delete("pagina"); // orice schimbare de filtru reîncepe de la pagina 1
    router.push(`${pathname}?${sp.toString()}`);
  }

  function setaPerioada(tip: PerioadaTip) {
    push({ perioada: tip === "toate" ? null : tip });
  }

  function toggleMarcaj(m: string) {
    const set = new Set(f.marcaje);
    if (set.has(m)) set.delete(m);
    else set.add(m);
    push({ marcaj: [...set] });
  }

  return (
    <div className="space-y-3 rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3.5">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: q.trim() || null });
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={dict.cautaPlaceholder}
          className="h-9 w-72"
        />
        <button type="submit" className="h-9 rounded-lg bg-[var(--ci-primary)] px-4 text-[13px] font-semibold text-white hover:opacity-90">
          {dict.cauta}
        </button>
        <button
          type="button"
          onClick={() => setExtins((v) => !v)}
          aria-expanded={extins}
          className="ml-auto flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] font-medium text-[var(--ci-text-muted)] transition-colors hover:bg-[var(--ci-surface-2)] hover:text-[var(--ci-text)]"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          {dict.filtre}
          {filtreActive > 0 && (
            <span className="ci-tabular rounded-full bg-[var(--ci-primary-soft)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--ci-primary)]">
              {filtreActive}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${extins ? "rotate-180" : ""}`} />
        </button>
      </form>

      {extins && (
      <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-[var(--ci-text-muted)]">{dict.perioada}</span>
        {PERIOADA_KEYS.map((key) => (
          <button key={key} type="button" onClick={() => setaPerioada(key)} className={pill(f.perioadaTip === key)}>
            {dict.perioade[key]}
          </button>
        ))}
        <Select value={String(f.an)} onChange={(e) => push({ an: e.target.value })} className="h-8 w-24 text-[12px]">
          {ANI.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
        {f.perioadaTip === "luna" && (
          <input
            type="month"
            defaultValue={f.luna}
            onChange={(e) => push({ luna: e.target.value })}
            className="h-8 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 text-[12px] text-[var(--ci-text)]"
          />
        )}
        {f.perioadaTip === "saptamana" && (
          <input
            type="week"
            defaultValue={f.saptamana}
            onChange={(e) => push({ saptamana: e.target.value })}
            className="h-8 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 text-[12px] text-[var(--ci-text)]"
          />
        )}
        <span className="mx-1 text-[var(--ci-border)]">|</span>
        <input
          type="date"
          value={dataStart}
          onChange={(e) => setDataStart(e.target.value)}
          className="h-8 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 text-[12px] text-[var(--ci-text)]"
        />
        <span className="text-[12px] text-[var(--ci-text-faint)]">–</span>
        <input
          type="date"
          value={dataSfarsit}
          onChange={(e) => setDataSfarsit(e.target.value)}
          className="h-8 rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 text-[12px] text-[var(--ci-text)]"
        />
        <button
          type="button"
          disabled={!dataStart || !dataSfarsit}
          onClick={() => push({ perioada: "interval", dataStart, dataSfarsit })}
          className="h-8 rounded-lg bg-[var(--ci-primary)] px-3 text-[12px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {dict.aplica}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-[var(--ci-text-muted)]">{dict.responsabil}</span>
        <button type="button" onClick={() => push({ responsabil: null })} className={pill(f.responsabil === "toti")}>
          {dict.toti}
        </button>
        <Select value={f.responsabil === "toti" ? "" : f.responsabil} onChange={(e) => push({ responsabil: e.target.value || null })} className="h-8 w-52 text-[12px]">
          <option value="">{dict.alegeResponsabil}</option>
          {responsabili.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name || dict.faraNume}
            </option>
          ))}
        </Select>

        <span className="mx-1 text-[var(--ci-border)]">|</span>
        <span className="text-[12px] font-semibold text-[var(--ci-text-muted)]">{dict.judet}</span>
        <Select value={f.judet} onChange={(e) => push({ judet: e.target.value === "toate" ? null : e.target.value })} className="h-8 w-40 text-[12px]">
          <option value="toate">{dict.toateJudetele}</option>
          {JUDETE.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </Select>

        <span className="mx-1 text-[var(--ci-border)]">|</span>
        <span className="text-[12px] font-semibold text-[var(--ci-text-muted)]">{dict.contact}</span>
        <button type="button" onClick={() => push({ contact: f.contact === "cu" ? null : "cu" })} className={pill(f.contact === "cu")}>
          {dict.cuContact}
        </button>
        <button type="button" onClick={() => push({ contact: f.contact === "fara" ? null : "fara" })} className={pill(f.contact === "fara")}>
          {dict.faraContact}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[12px] font-semibold text-[var(--ci-text-muted)]">{dict.marcaj}</span>
        <button type="button" onClick={() => toggleMarcaj("d177")} className={pill(f.marcaje.includes("d177"))}>
          D177
        </button>
        <button type="button" onClick={() => toggleMarcaj("decembrie")} className={pill(f.marcaje.includes("decembrie"))}>
          {dict.decembrie}
        </button>
        <button type="button" onClick={() => toggleMarcaj("caz")} className={pill(f.marcaje.includes("caz"))}>
          {dict.caz}
        </button>

        <span className="mx-1 text-[var(--ci-border)]">|</span>
        <span className="text-[12px] font-semibold text-[var(--ci-text-muted)]">{dict.vezi}</span>
        <button type="button" onClick={() => push({ vezi: null })} className={pill(f.vezi === "toata")}>
          {dict.toataBaza}
        </button>
        <button type="button" onClick={() => push({ vezi: f.vezi === "lucrate" ? null : "lucrate" })} className={pill(f.vezi === "lucrate")}>
          {dict.doarLucrate}
        </button>
      </div>
      </>
      )}
    </div>
  );
}
