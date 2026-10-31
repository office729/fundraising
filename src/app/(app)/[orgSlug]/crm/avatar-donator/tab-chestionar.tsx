"use client";

import { useMemo, useState } from "react";

import { AVATAR_UI_DICT } from "@/lib/i18n/dictionaries/avatar-donator-ui";
import { etapeLoc, gradeLoc } from "@/lib/avatar-donator/localizare";
import { esteCompletat } from "@/lib/avatar-donator/motor";
import { RASPUNS_GOL, type AvatarData, type Grad, type Raspuns } from "@/lib/avatar-donator/tipuri";

import { Input, Select, Textarea } from "../components/ui/input";
import { useLocale } from "../lib/locale-context";

import type { Actualizeaza } from "./avatar-donator-client";
import { Rich } from "./rich";

export function TabChestionar({
  data,
  actualizeaza,
  progres,
}: {
  data: AvatarData;
  actualizeaza: Actualizeaza;
  progres: { completate: number; total: number; masurate: number };
}) {
  const locale = useLocale();
  const d = AVATAR_UI_DICT[locale].chestionar;
  const ETAPE = useMemo(() => etapeLoc(locale), [locale]);
  const GRADE = gradeLoc(locale);
  const [deschise, setDeschise] = useState<Set<number>>(new Set([1]));
  const [doarNecompletate, setDoarNecompletate] = useState(false);
  // Prima etapă cu întrebări necompletate — „Continuă de unde ai rămas”.
  const primaNecompletata = ETAPE.find((e) => e.intrebari.some((q) => !esteCompletat(data.raspunsuri[q.nr])));

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
          <Rich text={d.progres(progres.completate, progres.total, progres.masurate)} />
        </p>
        <div
          role="progressbar"
          aria-label={d.progresAria}
          aria-valuemin={0}
          aria-valuemax={progres.total}
          aria-valuenow={progres.completate}
          className="mt-2 h-2 overflow-hidden rounded-full bg-[var(--ci-surface-2)]"
        >
          <div className="h-full rounded-full bg-[var(--ci-primary)]" style={{ width: `${(progres.completate / progres.total) * 100}%` }} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[12.5px]">
          {primaNecompletata && (
            <button
              type="button"
              onClick={() => setDeschise((s) => new Set(s).add(primaNecompletata.nr))}
              className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2.5 py-1 font-medium text-[var(--ci-primary)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
            >
              {d.continua(primaNecompletata.nr)}
            </button>
          )}
          <button
            type="button"
            onClick={() => setDeschise(deschise.size >= ETAPE.length ? new Set() : new Set(ETAPE.map((e) => e.nr)))}
            className="rounded-[var(--ci-radius-btn)] border border-[var(--ci-border)] px-2.5 py-1 font-medium text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)] focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
          >
            {deschise.size >= ETAPE.length ? d.inchideTot : d.deschideTot}
          </button>
          <label className="flex cursor-pointer items-center gap-1.5 text-[var(--ci-text)]">
            <input type="checkbox" checked={doarNecompletate} onChange={(e) => setDoarNecompletate(e.target.checked)} className="accent-[var(--ci-primary)]" />
            {d.doarNecompletate}
          </label>
        </div>
        <p className="mt-2 text-[12px] leading-relaxed text-[var(--ci-text-muted)]">
          <Rich text={d.ghidGrad} />
        </p>
      </div>

      {ETAPE.map((etapa) => {
        const completate = etapa.intrebari.filter((q) => esteCompletat(data.raspunsuri[q.nr])).length;
        const deschisa = deschise.has(etapa.nr);
        return (
          <section key={etapa.nr} className="rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)]">
            <button
              type="button"
              onClick={() => comuta(etapa.nr)}
              aria-expanded={deschisa}
              aria-controls={`etapa-${etapa.nr}`}
              className="flex w-full items-center justify-between gap-3 rounded-[var(--ci-radius-card)] px-4 py-3 text-left focus-visible:ring-2 focus-visible:ring-[var(--ci-primary)] focus-visible:outline-none"
            >
              <span className="text-[14px] font-bold text-[var(--ci-text)]">{d.etapa(etapa.nr, etapa.titlu)}</span>
              <span className="ci-tabular shrink-0 text-[12px] text-[var(--ci-text-muted)]">
                {completate}/{etapa.intrebari.length} <span aria-hidden="true">{deschisa ? "▴" : "▾"}</span>
              </span>
            </button>
            {deschisa && (
              <div id={`etapa-${etapa.nr}`} className="space-y-4 border-t border-[var(--ci-border)] p-4">
                {etapa.intrebari
                  .filter((q) => !doarNecompletate || !esteCompletat(data.raspunsuri[q.nr]))
                  .map((q) => {
                    const r = data.raspunsuri[q.nr] ?? RASPUNS_GOL;
                    const gata = esteCompletat(r);
                    return (
                      <div key={q.nr} className="space-y-2">
                        <p className="text-[13px] font-semibold text-[var(--ci-text)]">
                          {gata && (
                            <span className="mr-1 text-[var(--ci-green)]" aria-label={d.completata}>
                              ✓
                            </span>
                          )}
                          {q.nr}. {q.text}
                        </p>
                        <Textarea rows={2} value={r.text} onChange={(e) => setCamp(q.nr, "text", e.target.value)} placeholder={q.prompt} aria-label={d.raspunsAria(q.nr, q.prompt)} />
                        <div className="grid gap-2 sm:grid-cols-4">
                          <Input value={r.variante} onChange={(e) => setCamp(q.nr, "variante", e.target.value)} placeholder={d.variante} aria-label={d.variantaAria(q.nr)} />
                          <Select value={r.grad} onChange={(e) => setCamp(q.nr, "grad", e.target.value)} aria-label={d.gradAria(q.nr)}>
                            <option value="">{d.grad}</option>
                            {GRADE.map((g) => (
                              <option key={g.key} value={g.key}>
                                {g.label}
                              </option>
                            ))}
                          </Select>
                          <Input value={r.perioada} onChange={(e) => setCamp(q.nr, "perioada", e.target.value)} placeholder={d.perioada} aria-label={d.perioadaAria(q.nr)} />
                          <Input value={r.responsabil} onChange={(e) => setCamp(q.nr, "responsabil", e.target.value)} placeholder={d.responsabil} aria-label={d.responsabilAria(q.nr)} />
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
