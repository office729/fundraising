"use client";

import { useMemo, useState } from "react";

import { Badge } from "../components/ui/badge";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";

export type BeneficiarRow = {
  id: string;
  email: string;
  status: "activ" | "dezactivat";
  createdAt: string;
  campaignPageId: string;
  campaignTitlu: string;
  campaignJudet: string | null;
  campaignStatus: "activa" | "inchisa";
  sumaStransa: number;
  sumaTinta: number | null;
  agent: { agentNume: string | null; agentEmail: string } | null;
};

export function PanouBeneficiari({ orgSlug, beneficiari }: { orgSlug: string; beneficiari: BeneficiarRow[] }) {
  const [judetFiltru, setJudetFiltru] = useState("toate");
  const [statusFiltru, setStatusFiltru] = useState("toate");
  const [agentFiltru, setAgentFiltru] = useState("toate");

  const judete = useMemo(() => Array.from(new Set(beneficiari.map((b) => b.campaignJudet).filter((j): j is string => Boolean(j)))).sort(), [beneficiari]);
  const agenti = useMemo(
    () => Array.from(new Set(beneficiari.map((b) => b.agent?.agentEmail).filter((e): e is string => Boolean(e)))).sort(),
    [beneficiari],
  );

  const filtrati = beneficiari.filter((b) => {
    if (judetFiltru !== "toate" && b.campaignJudet !== judetFiltru) return false;
    if (statusFiltru !== "toate" && b.status !== statusFiltru) return false;
    if (agentFiltru !== "toate" && b.agent?.agentEmail !== agentFiltru) return false;
    return true;
  });

  return (
    <Card>
      <CardHeader title="Toți beneficiarii" subtitle={`${filtrati.length} din ${beneficiari.length} — filtrează după județ, status sau agent`} />
      <div className="mb-3 flex flex-wrap gap-2">
        <select value={judetFiltru} onChange={(e) => setJudetFiltru(e.target.value)} className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-1.5 text-[13px]">
          <option value="toate">Toate județele</option>
          {judete.map((j) => (
            <option key={j} value={j}>
              {j}
            </option>
          ))}
        </select>
        <select value={statusFiltru} onChange={(e) => setStatusFiltru(e.target.value)} className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-1.5 text-[13px]">
          <option value="toate">Toate statusurile</option>
          <option value="activ">Activ</option>
          <option value="dezactivat">Dezactivat</option>
        </select>
        <select value={agentFiltru} onChange={(e) => setAgentFiltru(e.target.value)} className="rounded-lg border border-[var(--ci-border)] bg-[var(--ci-surface)] px-3 py-1.5 text-[13px]">
          <option value="toate">Toți agenții</option>
          {agenti.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {filtrati.length ? (
        <div className="flex flex-col gap-2">
          {filtrati.map((b) => {
            const procent = b.sumaTinta ? Math.min(100, Math.round((b.sumaStransa / b.sumaTinta) * 100)) : null;
            return (
              <a
                key={b.id}
                href={`/${orgSlug}/crm/strangere-fonduri/${b.campaignPageId}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-[var(--ci-border)] px-3.5 py-2.5 hover:border-[var(--ci-border-strong)]"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-[var(--ci-text)]">{b.campaignTitlu}</span>
                    <Badge tone={b.status === "activ" ? "green" : "neutral"} icon={false}>
                      {b.status === "activ" ? "Activ" : "Dezactivat"}
                    </Badge>
                  </div>
                  <p className="truncate text-[12px] text-[var(--ci-text-muted)]">
                    {b.email} {b.campaignJudet ? `· ${b.campaignJudet}` : ""} {b.agent ? `· agent: ${b.agent.agentNume || b.agent.agentEmail}` : "· fără agent"}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="ci-tabular text-[13px] font-semibold text-[var(--ci-text)]">{procent != null ? `${procent}%` : "—"}</p>
                  <p className="text-[11px] text-[var(--ci-text-faint)]">{b.sumaStransa.toLocaleString("ro-RO")} lei</p>
                </div>
              </a>
            );
          })}
        </div>
      ) : (
        <EmptyState title="Niciun beneficiar" description="Niciun beneficiar nu corespunde filtrelor alese." />
      )}
    </Card>
  );
}
