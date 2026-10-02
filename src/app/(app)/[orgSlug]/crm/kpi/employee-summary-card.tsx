"use client";

import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import type { RezumatAngajat } from "@/lib/kpi-engine";

// Card per angajat — Nume, Rol, Scor, KPI principali, Restanțe, Obiective,
// Status (din cerință, secțiunea 22). Niciun clasament implicit — gridul
// care randează aceste carduri sortează mereu alfabetic, nu după scor.
export function EmployeeSummaryCard({ r }: { r: RezumatAngajat }) {
  const principale = r.kpiuri.slice(0, 3);
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-[var(--ci-text)]">
            {r.nume} {r.prenume}
          </p>
          {r.roleNume && <p className="text-[12px] text-[var(--ci-text-muted)]">{r.roleNume}</p>}
        </div>
        {r.scorMediu !== null && (
          <div className="text-right">
            <p className="ci-tabular text-lg font-bold text-[var(--ci-text)]">{r.scorMediu}%</p>
            <p className="text-[11px] text-[var(--ci-text-faint)]">scor mediu</p>
          </div>
        )}
      </div>

      {principale.length > 0 ? (
        <div className="mt-3 space-y-1.5">
          {principale.map((k) => (
            <div key={k.nume} className="flex items-center justify-between text-[12px]">
              <span className="truncate text-[var(--ci-text-muted)]">{k.nume}</span>
              <span className="ci-tabular shrink-0 text-[var(--ci-text)]">
                {k.valoare ?? "—"}
                {k.targetNormal != null ? ` / ${k.targetNormal}` : ""}
                {k.unitate ? ` ${k.unitate}` : ""}
              </span>
            </div>
          ))}
          {r.kpiuri.length > 3 && <p className="text-[11px] text-[var(--ci-text-faint)]">+{r.kpiuri.length - 3} alte KPI</p>}
        </div>
      ) : (
        <p className="mt-3 text-[12px] text-[var(--ci-text-faint)]">Niciun KPI atribuit încă.</p>
      )}

      <div className="mt-3 flex flex-wrap gap-1.5">
        <Badge tone={r.restante > 0 ? "amber" : "neutral"}>{r.restante} sub țintă</Badge>
        <Badge tone="green">{r.finalizate} finalizate</Badge>
      </div>
    </Card>
  );
}
