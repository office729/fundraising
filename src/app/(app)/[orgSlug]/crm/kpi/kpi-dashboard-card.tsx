"use client";

import { Badge } from "../components/ui/badge";
import { Card } from "../components/ui/card";
import type { KpiDashboardRand } from "./dashboard-actions";

const STATUS_CONFIG: Record<KpiDashboardRand["status"], { eticheta: string; tone: "neutral" | "green" | "amber" | "red" | "blue" }> = {
  neinceput: { eticheta: "Neînceput", tone: "neutral" },
  in_grafic: { eticheta: "În grafic", tone: "blue" },
  necesita_atentie: { eticheta: "Necesită atenție", tone: "amber" },
  restant: { eticheta: "Restant", tone: "red" },
  finalizat: { eticheta: "Finalizat", tone: "green" },
};

function Sparkline({ puncte }: { puncte: { valoare: number }[] }) {
  if (puncte.length < 2) return null;
  const valori = puncte.map((p) => p.valoare);
  const min = Math.min(...valori);
  const max = Math.max(...valori);
  const span = max - min || 1;
  const w = 120;
  const h = 28;
  const coords = valori.map((v, i) => `${(i / (valori.length - 1)) * w},${h - ((v - min) / span) * h}`);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-7 w-[120px]" preserveAspectRatio="none">
      <polyline points={coords.join(" ")} fill="none" stroke="var(--ci-primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function KpiDashboardCard({ kpi }: { kpi: KpiDashboardRand }) {
  const cfg = STATUS_CONFIG[kpi.status];
  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-medium text-[var(--ci-text)]">{kpi.nume}</p>
        <Badge tone={cfg.tone}>{cfg.eticheta}</Badge>
      </div>
      <p className="ci-tabular mt-2 text-2xl font-bold text-[var(--ci-text)]">
        {kpi.valoare ?? "—"}
        {kpi.unitate && kpi.valoare != null && <span className="ml-1 text-sm font-normal text-[var(--ci-text-muted)]">{kpi.unitate}</span>}
      </p>
      {kpi.targetNormal != null && (
        <p className="mt-0.5 text-[12px] text-[var(--ci-text-muted)]">
          target {kpi.targetNormal}
          {kpi.unitate ? ` ${kpi.unitate}` : ""} {kpi.progres != null && `· ${kpi.progres}%`}
        </p>
      )}
      {kpi.targetNormal != null && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
          <div
            className={`h-full rounded-full ${kpi.status === "restant" ? "bg-[var(--ci-red)]" : kpi.status === "necesita_atentie" ? "bg-[var(--ci-amber)]" : "bg-[var(--ci-primary)]"}`}
            style={{ width: `${Math.min(100, kpi.progres ?? 0)}%` }}
          />
        </div>
      )}
      <div className="mt-3 flex items-center justify-between">
        <Sparkline puncte={kpi.istoric} />
        {kpi.pondere != null && <span className="text-[11px] text-[var(--ci-text-faint)]">{kpi.pondere}% din scor</span>}
      </div>
    </Card>
  );
}
