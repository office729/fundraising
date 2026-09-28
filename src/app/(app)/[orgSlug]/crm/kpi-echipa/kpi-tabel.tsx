"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { KPI_LABEL, KPI_METRICE, type KpiEchipa, type KpiMetric, tintaPerioada } from "@/lib/kpi-echipa";

import { salveazaKpiTinte } from "./actions";

function culoarePct(pct: number): string {
  if (pct >= 100) return "var(--ci-green)";
  if (pct >= 60) return "var(--ci-amber)";
  return "var(--ci-red)";
}

// Tabelul KPI al echipei pe perioada aleasă — realizat / țintă scalată la zilele lucrătoare.
// Doar owner/admin ajung aici (vezi page.tsx) și pot edita țintele lunare.
export function KpiTabel({ kpi }: { kpi: KpiEchipa }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [busy, start] = useTransition();
  const [eroare, setEroare] = useState("");
  const [editare, setEditare] = useState(false);
  const [local, setLocal] = useState<Record<string, Partial<Record<KpiMetric, string>>>>({});

  const label = kpi.eArbitrara ? `${kpi.perioada.de} → ${kpi.perioada.la}` : `luna curentă (${kpi.perioada.de} → ${kpi.perioada.la})`;

  function porneste() {
    const init: Record<string, Partial<Record<KpiMetric, string>>> = {};
    for (const r of kpi.rows) {
      init[r.id] = {};
      for (const m of KPI_METRICE) init[r.id][m] = r.tintaLunara[m] ? String(r.tintaLunara[m]) : "";
    }
    setLocal(init);
    setEroare("");
    setEditare(true);
  }

  function salveaza() {
    const tinte: Record<string, Partial<Record<KpiMetric, number>>> = {};
    for (const [uid, m] of Object.entries(local)) {
      const per: Partial<Record<KpiMetric, number>> = {};
      for (const k of KPI_METRICE) {
        const v = Math.round(Number(m[k]));
        if (Number.isFinite(v) && v > 0) per[k] = v;
      }
      tinte[uid] = per;
    }
    start(async () => {
      try {
        await salveazaKpiTinte(orgSlug, tinte);
        setEditare(false);
        router.refresh();
      } catch {
        setEroare("Nu s-au putut salva țintele.");
      }
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="ci-display text-lg font-bold text-[var(--ci-text)]">
          KPI echipă <span className="text-[13px] font-normal text-[var(--ci-text-muted)]">({label})</span>
        </h2>
        {editare ? (
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setEditare(false)} className="rounded-lg border border-[var(--ci-border)] px-3 py-1.5 text-[13px] font-medium text-[var(--ci-text-muted)] hover:bg-[var(--ci-surface-2)]">
              Renunță
            </button>
            <button type="button" onClick={salveaza} disabled={busy} className="rounded-lg bg-[var(--ci-primary)] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-[var(--ci-primary-hover)] disabled:opacity-50">
              {busy ? "Se salvează…" : "Salvează țintele"}
            </button>
          </div>
        ) : (
          <button type="button" onClick={porneste} className="rounded-lg border border-[var(--ci-border)] px-3 py-1.5 text-[13px] font-semibold text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]">
            Editează țintele
          </button>
        )}
      </div>
      {eroare && <p className="mt-1 text-[12px] text-[var(--ci-red)]">{eroare}</p>}

      <div className="mt-2 rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-[13px]">
            <thead>
              <tr className="border-b border-[var(--ci-border)] text-right text-[12px] text-[var(--ci-text-muted)]">
                <th className="py-1.5 pr-3 text-left">Membru</th>
                {KPI_METRICE.map((m) => (
                  <th key={m} className="px-3 py-1.5">{KPI_LABEL[m]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {kpi.rows.map((r) => (
                <tr key={r.id} className="border-b border-dashed border-[var(--ci-border)] text-right">
                  <td className="py-2 pr-3 text-left font-medium text-[var(--ci-text)]">{r.nume}</td>
                  {KPI_METRICE.map((m) => {
                    const real = r.realizat[m];
                    if (editare) {
                      return (
                        <td key={m} className="px-3 py-2">
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="ci-tabular text-[12px] text-[var(--ci-text-muted)]">{real} realizat</span>
                            <input
                              type="number"
                              min={0}
                              value={local[r.id]?.[m] ?? ""}
                              onChange={(e) => setLocal((s) => ({ ...s, [r.id]: { ...s[r.id], [m]: e.target.value } }))}
                              placeholder="țintă/lună"
                              className="ci-tabular w-24 rounded-md border border-[var(--ci-border)] bg-[var(--ci-surface)] px-2 py-1 text-right text-[13px] text-[var(--ci-text)]"
                            />
                          </div>
                        </td>
                      );
                    }
                    const luna = r.tintaLunara[m];
                    if (!luna) {
                      return (
                        <td key={m} className="ci-tabular px-3 py-2 font-semibold text-[var(--ci-text)]">
                          {real}
                          <div className="text-[10.5px] font-normal text-[var(--ci-text-faint)]">fără țintă</div>
                        </td>
                      );
                    }
                    const tinta = tintaPerioada(luna, kpi.zileLucratoare, kpi.bazaLunara);
                    const pct = tinta > 0 ? Math.round((real / tinta) * 100) : 0;
                    return (
                      <td key={m} className="px-3 py-2">
                        <span className="ci-tabular font-bold" style={{ color: culoarePct(pct) }}>{real}</span>
                        <span className="ci-tabular text-[12px] text-[var(--ci-text-muted)]"> / {tinta}</span>
                        <div className="text-[10.5px] font-semibold" style={{ color: culoarePct(pct) }}>{pct}%</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-[var(--ci-text-muted)]">
          Ținta e <b className="text-[var(--ci-text)]">lunară</b> (o setează administratorul) și se scalează automat după <b className="text-[var(--ci-text)]">zilele lucrătoare</b> — weekendurile și sărbătorile legale nu se numără:
          {" "}<b className="text-[var(--ci-text)]">țintă afișată = țintă lunară × {kpi.zileLucratoare} zile lucrătoare ÷ {kpi.bazaLunara} (zile lucrătoare din lună)</b>.
          Verde ≥ 100%, galben ≥ 60%, roșu sub. Realizatul vine din activitatea reală din CRM (cine a lucrat pe firme, contacte, apeluri, sponsorizări, notițe, mutări în pipeline); emailurile și întâlnirile se contorizează manual cu butonul +1 din KPI-ul propriu.
        </p>
      </div>
    </div>
  );
}
