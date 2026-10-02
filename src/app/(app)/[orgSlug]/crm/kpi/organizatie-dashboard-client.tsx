"use client";

import { LayoutGrid } from "lucide-react";

import { Breadcrumb } from "../components/ui/breadcrumb";
import { Card, CardHeader } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import type { OrganizatieDashboard } from "./echipa-actions";
import { EmployeeSummaryCard } from "./employee-summary-card";

export function OrganizatieDashboardClient({ orgSlug, dashboard }: { orgSlug: string; dashboard: OrganizatieDashboard }) {
  const cuScor = dashboard.echipa.filter((r) => r.scorMediu !== null);
  const scorMediu = cuScor.length ? Math.round(cuScor.reduce((s, r) => s + (r.scorMediu as number), 0) / cuScor.length) : null;
  const restanteTotale = dashboard.echipa.reduce((s, r) => s + r.restante, 0);

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: "Instrumente", href: `/${orgSlug}/crm/instrumente` }, { label: "KPI Library", href: `/${orgSlug}/crm/kpi` }, { label: "Organizație" }]} />

      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Dashboard organizație</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">Privire de ansamblu peste toate departamentele.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">Oameni</p>
          <p className="ci-tabular mt-1 text-lg font-bold text-[var(--ci-text)]">{dashboard.echipa.length}</p>
        </Card>
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">Scor mediu organizație</p>
          <p className="ci-tabular mt-1 text-lg font-bold text-[var(--ci-text)]">{scorMediu !== null ? `${scorMediu}%` : "—"}</p>
        </Card>
        <Card>
          <p className="text-[12px] text-[var(--ci-text-muted)]">KPI sub țintă</p>
          <p className="ci-tabular mt-1 text-lg font-bold text-[var(--ci-text)]">{restanteTotale}</p>
        </Card>
      </div>

      <Card>
        <CardHeader title="Pe departamente" subtitle={`${dashboard.peDepartament.length} grupuri`} />
        {dashboard.peDepartament.length === 0 ? (
          <EmptyState icon={LayoutGrid} title="Niciun angajat încă" />
        ) : (
          <div className="space-y-2">
            {dashboard.peDepartament.map((d) => (
              <div key={d.departamentId ?? "fara"} className="flex items-center justify-between gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] px-3.5 py-2.5">
                <div>
                  <p className="text-[13px] font-medium text-[var(--ci-text)]">{d.departamentNume}</p>
                  <p className="text-[12px] text-[var(--ci-text-muted)]">{d.membri} membri</p>
                </div>
                <div className="flex items-center gap-3 text-[13px]">
                  <span className="ci-tabular text-[var(--ci-text)]">{d.scorMediu !== null ? `${d.scorMediu}% scor` : "—"}</span>
                  {d.restante > 0 && <span className="ci-tabular text-[var(--ci-amber)]">{d.restante} sub țintă</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <section>
        <h2 className="mb-3 text-[13px] font-semibold text-[var(--ci-text-muted)] uppercase">Toți oamenii</h2>
        {dashboard.echipa.length === 0 ? (
          <EmptyState title="Niciun angajat încă" description="Adaugă-i din Organizație & Echipă." />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dashboard.echipa.map((r) => <EmployeeSummaryCard key={r.angajatId} r={r} />)}
          </div>
        )}
      </section>
    </div>
  );
}
