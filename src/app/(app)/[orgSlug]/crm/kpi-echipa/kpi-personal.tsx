"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { KpiPersonal, KpiPersonalMetric } from "@/lib/kpi-echipa";

import { anuleazaKpi, logKpi } from "./actions";

type Interval = "azi" | "sapt" | "luna" | "an";
const FILTRE: { key: Interval; label: string }[] = [
  { key: "azi", label: "Azi" },
  { key: "sapt", label: "Săptămâna aceasta" },
  { key: "luna", label: "Luna aceasta" },
  { key: "an", label: "Anul acesta" },
];

function culoare(pct: number): string {
  if (pct >= 100) return "var(--ci-green)";
  if (pct >= 60) return "var(--ci-amber)";
  return "var(--ci-red)";
}

function valori(m: KpiPersonalMetric, iv: Interval): { real: number; tinta: number | null } {
  if (iv === "azi") return { real: m.azi, tinta: m.tintaZi };
  if (iv === "sapt") return { real: m.sapt, tinta: m.tintaSapt };
  if (iv === "luna") return { real: m.luna, tinta: m.tintaLuna };
  return { real: m.an, tinta: m.tintaAn };
}

function Contor({ cheie, label }: { cheie: string; label: string }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [busy, start] = useTransition();
  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          start(async () => {
            await logKpi(orgSlug, cheie);
            router.refresh();
          })
        }
        className="rounded-md bg-[var(--ci-primary)] px-2.5 py-1 text-[12px] font-semibold text-white disabled:opacity-50"
        title={`Adaugă 1 la ${label} (azi)`}
      >
        +1 {label.toLowerCase()}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() =>
          start(async () => {
            await anuleazaKpi(orgSlug, cheie);
            router.refresh();
          })
        }
        className="rounded-md border border-[var(--ci-border)] px-2 py-1 text-[12px] text-[var(--ci-text-muted)] disabled:opacity-50"
        title="Anulează ultima de azi"
      >
        −1
      </button>
    </div>
  );
}

export function KpiPersonalView({ kpi }: { kpi: KpiPersonal }) {
  const [iv, setIv] = useState<Interval>("luna");
  const pace = iv === "sapt" ? kpi.paceSaptPct : iv === "luna" ? kpi.paceLunaPct : iv === "an" ? kpi.paceAnPct : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {FILTRE.map((f) => {
          const activ = f.key === iv;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setIv(f.key)}
              className={`rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                activ
                  ? "border-[var(--ci-primary)] bg-[var(--ci-primary)] text-white"
                  : "border-[var(--ci-border)] bg-[var(--ci-surface)] text-[var(--ci-text)] hover:bg-[var(--ci-surface-2)]"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {pace != null && (
        <p className="text-[12px] text-[var(--ci-text-muted)]">
          {iv === "sapt" ? "Din săptămână" : iv === "luna" ? "Din lună" : "Din an"} a trecut <b className="text-[var(--ci-text)]">{pace}%</b> (zile lucrătoare) — reper dacă ești pe grafic.
        </p>
      )}

      <div className="rounded-xl border border-[var(--ci-border)] bg-[var(--ci-surface)] p-4">
        <div className="divide-y divide-dashed divide-[var(--ci-border)]">
          {kpi.metrice.map((m) => {
            const { real, tinta } = valori(m, iv);
            const pct = tinta && tinta > 0 ? Math.round((real / tinta) * 100) : 0;
            const c = tinta != null ? culoare(pct) : "var(--ci-text)";
            return (
              <div key={m.cheie} className="flex items-start justify-between py-2.5">
                <div>
                  <span className="text-[13px] font-medium text-[var(--ci-text)]">{m.label}</span>
                  {m.manual && <Contor cheie={m.cheie} label={m.label} />}
                </div>
                <div className="flex items-baseline gap-2 text-right">
                  {tinta == null ? (
                    <>
                      <span className="ci-tabular text-[18px] font-bold text-[var(--ci-text)]">{real.toLocaleString("ro-RO")}</span>
                      <span className="text-[11px] text-[var(--ci-text-faint)]">fără țintă</span>
                    </>
                  ) : (
                    <>
                      <span className="ci-tabular text-[18px] font-bold" style={{ color: c }}>{real.toLocaleString("ro-RO")}</span>
                      <span className="ci-tabular text-[12px] text-[var(--ci-text-muted)]">/ {tinta.toLocaleString("ro-RO")}</span>
                      <span className="ci-tabular w-12 text-[12px] font-semibold" style={{ color: c }}>{pct}%</span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
