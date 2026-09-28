"use client";

import { useState } from "react";

import { ETAPE } from "@/lib/avatar-donator/intrebari";
import { esteCompletat } from "@/lib/avatar-donator/motor";
import { GRADE, RASPUNS_GOL, type AvatarData, type Grad, type Raspuns } from "@/lib/avatar-donator/tipuri";

import { Input, Select, Textarea } from "../components/ui/input";

import type { Actualizeaza } from "./avatar-donator-client";

export function TabChestionar({
  data,
  actualizeaza,
  progres,
}: {
  data: AvatarData;
  actualizeaza: Actualizeaza;
  progres: { completate: number; total: number; masurate: number };
}) {
  const [deschise, setDeschise] = useState<Set<number>>(new Set([1]));

  const setCamp = (nr: number, k: keyof Raspuns, v: string) =>
    actualizeaza((d) => ({ ...d, raspunsuri: { ...d.raspunsuri, [nr]: { ...(d.raspunsuri[nr] ?? RASPUNS_GOL), [k]: v as Grad & string } } }));

  function comuta(nr: number) {
    setDeschise((s) => {
      const n = new Set(s);
      if (n.has(nr)) n.delete(nr);
      else n.add(nr);
      return n;
    });
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-3.5">
        <p className="text-[13px] text-[var(--ci-text)]">
          <b>{progres.completate}</b> din {progres.total} întrebări completate, dintre care <b>{progres.masurate}</b> cu date măsurate.
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
          <div className="h-full rounded-full bg-[var(--ci-primary)]" style={{ width: `${(progres.completate / progres.total) * 100}%` }} />
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-[var(--ci-text-muted)]">
          La fiecare răspuns alege <b>gradul</b> de încredere: <i>Măsurat</i> (din date reale), <i>Estimat</i> sau <i>Ipoteză</i> (încă nevalidată). Scorul de maturitate ține cont de el. Răspunde cu cifre și citate reale, nu cu impresii.
        </p>
      </div>

      {ETAPE.map((etapa) => {
        const completate = etapa.intrebari.filter((q) => esteCompletat(data.raspunsuri[q.nr])).length;
        const deschisa = deschise.has(etapa.nr);
        return (
          <section key={etapa.nr} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
            <button type="button" onClick={() => comuta(etapa.nr)} aria-expanded={deschisa} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
              <span className="text-[14px] font-bold text-[var(--ci-text)]">
                Etapa {etapa.nr}. {etapa.titlu}
              </span>
              <span className="ci-tabular shrink-0 text-[12px] text-[var(--ci-text-muted)]">
                {completate}/{etapa.intrebari.length} {deschisa ? "▴" : "▾"}
              </span>
            </button>
            {deschisa && (
              <div className="space-y-4 border-t border-[var(--ci-border)] p-4">
                {etapa.intrebari.map((q) => {
                  const r = data.raspunsuri[q.nr] ?? RASPUNS_GOL;
                  return (
                    <div key={q.nr} className="space-y-2">
                      <p className="text-[13px] font-semibold text-[var(--ci-text)]">
                        {q.nr}. {q.text}
                      </p>
                      <Textarea rows={2} value={r.text} onChange={(e) => setCamp(q.nr, "text", e.target.value)} placeholder={q.prompt} />
                      <div className="grid gap-2 sm:grid-cols-4">
                        <Input value={r.variante} onChange={(e) => setCamp(q.nr, "variante", e.target.value)} placeholder="Variante alese" />
                        <Select value={r.grad} onChange={(e) => setCamp(q.nr, "grad", e.target.value)}>
                          <option value="">Grad — alege</option>
                          {GRADE.map((g) => (
                            <option key={g.key} value={g.key}>
                              {g.label}
                            </option>
                          ))}
                        </Select>
                        <Input value={r.perioada} onChange={(e) => setCamp(q.nr, "perioada", e.target.value)} placeholder="Perioadă (ex. 2025–2026)" />
                        <Input value={r.responsabil} onChange={(e) => setCamp(q.nr, "responsabil", e.target.value)} placeholder="Responsabil" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
