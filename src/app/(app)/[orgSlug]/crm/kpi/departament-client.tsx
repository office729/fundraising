"use client";

import { Building2 } from "lucide-react";
import { useState, useTransition } from "react";

import { Breadcrumb } from "../components/ui/breadcrumb";
import { Card } from "../components/ui/card";
import { Select } from "../components/ui/input";
import { EmptyState } from "../components/ui/states";
import { obtineDepartamentDashboardAction, type DepartamentDashboard, type DepartamentOptiune } from "./echipa-actions";
import { EmployeeSummaryCard } from "./employee-summary-card";

export function DepartamentClient({
  orgSlug,
  departamente,
  initialDepartamentId,
  initial,
}: {
  orgSlug: string;
  departamente: DepartamentOptiune[];
  initialDepartamentId: string | null;
  initial: DepartamentDashboard | null;
}) {
  const [departamentId, setDepartamentId] = useState(initialDepartamentId ?? "");
  const [dashboard, setDashboard] = useState(initial);
  const [eroare, setEroare] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const schimba = (id: string) => {
    setDepartamentId(id);
    setEroare(null);
    start(async () => {
      try {
        setDashboard(id ? await obtineDepartamentDashboardAction(orgSlug, id) : null);
      } catch (e) {
        setEroare(e instanceof Error ? e.message : "Eroare.");
      }
    });
  };

  if (departamente.length === 0) {
    return (
      <div className="mx-auto max-w-[700px]">
        <EmptyState icon={Building2} title="Niciun departament accesibil" description="Doar owner/admin, sau un admin de departament desemnat, pot vedea acest dashboard." />
      </div>
    );
  }

  const cuScor = dashboard?.echipa.filter((r) => r.scorMediu !== null) ?? [];
  const scorMediu = cuScor.length ? Math.round(cuScor.reduce((s, r) => s + (r.scorMediu as number), 0) / cuScor.length) : null;
  const restanteTotale = dashboard?.echipa.reduce((s, r) => s + r.restante, 0) ?? 0;

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: "Instrumente", href: `/${orgSlug}/crm/instrumente` }, { label: "KPI Library", href: `/${orgSlug}/crm/kpi` }, { label: "Departament" }]} />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Dashboard departament</h1>
          <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dashboard?.departamentNume ?? "Alege un departament"}</p>
        </div>
        {departamente.length > 1 && (
          <Select value={departamentId} onChange={(e) => schimba(e.target.value)} className="w-56">
            {departamente.map((d) => <option key={d.id} value={d.id}>{d.nume}</option>)}
          </Select>
        )}
      </div>

      {eroare && <p className="text-[13px] text-[var(--ci-red)]">{eroare}</p>}

      {!pending && dashboard && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Card>
              <p className="text-[12px] text-[var(--ci-text-muted)]">Membri</p>
              <p className="ci-tabular mt-1 text-lg font-bold text-[var(--ci-text)]">{dashboard.echipa.length}</p>
            </Card>
            <Card>
              <p className="text-[12px] text-[var(--ci-text-muted)]">Scor mediu</p>
              <p className="ci-tabular mt-1 text-lg font-bold text-[var(--ci-text)]">{scorMediu !== null ? `${scorMediu}%` : "—"}</p>
            </Card>
            <Card>
              <p className="text-[12px] text-[var(--ci-text-muted)]">KPI sub țintă</p>
              <p className="ci-tabular mt-1 text-lg font-bold text-[var(--ci-text)]">{restanteTotale}</p>
            </Card>
          </div>

          {dashboard.echipa.length === 0 ? (
            <EmptyState icon={Building2} title="Niciun membru în acest departament" />
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dashboard.echipa.map((r) => <EmployeeSummaryCard key={r.angajatId} r={r} />)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
