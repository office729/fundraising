"use client";

import { CalendarRange, Eye, Sparkles, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { Breadcrumb } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { EmptyState } from "../components/ui/states";
import type { DashboardPersonal } from "./dashboard-actions";
import { KpiDashboardCard } from "./kpi-dashboard-card";

// Severitate pentru sortare — cele mai sub țintă întâi, ca „Prezentare
// generală" să rămână scanabilă în 5 secunde chiar cu 8-10 KPI atribuite.
const ORDINE_SEVERITATE: Record<DashboardPersonal["kpiuri"][number]["status"], number> = {
  restant: 0,
  necesita_atentie: 1,
  in_grafic: 2,
  neinceput: 3,
  finalizat: 4,
};

export function DashboardClient({ orgSlug, dashboard }: { orgSlug: string; dashboard: DashboardPersonal }) {
  const router = useRouter();
  const kpiuriOrdonate = useMemo(() => [...dashboard.kpiuri].sort((a, b) => ORDINE_SEVERITATE[a.status] - ORDINE_SEVERITATE[b.status]), [dashboard.kpiuri]);
  const restante = useMemo(() => dashboard.kpiuri.filter((k) => k.status === "restant"), [dashboard.kpiuri]);
  const cuObiectiv = useMemo(() => dashboard.kpiuri.filter((k) => k.targetNormal != null), [dashboard.kpiuri]);

  if (!dashboard.areProfil) {
    return (
      <div className="mx-auto max-w-[700px]">
        <EmptyState
          icon={Sparkles}
          title="Nu ai încă un profil de angajat"
          description="Un administrator trebuie să te adauge în „Organizație & Echipă” (legat de contul tău) ca să-ți vezi aici performanța."
          action={<Button size="sm" onClick={() => router.push(`/${orgSlug}/crm/organizatie`)}>Vezi Organizație & Echipă</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: "Instrumente", href: `/${orgSlug}/crm/instrumente` }, { label: "KPI Library", href: `/${orgSlug}/crm/kpi` }, { label: "Performanța mea" }]} />

      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Performanța mea</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{dashboard.angajatNume}</p>
      </div>

      {dashboard.profileSezoniereActive.length > 0 && (
        <div className="flex items-center gap-2 rounded-[var(--ci-radius-card)] border border-[var(--ci-primary-soft)] bg-[var(--ci-primary-soft)] px-3.5 py-2.5 text-[13px] text-[var(--ci-text)]">
          <CalendarRange className="h-4 w-4 shrink-0 text-[var(--ci-primary)]" />
          <p>
            Perioadă sezonieră activă: <span className="font-medium">{dashboard.profileSezoniereActive.join(", ")}</span> — targeturile de mai jos sunt ajustate pentru această perioadă.
          </p>
        </div>
      )}

      {dashboard.kpiuri.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Nu ai încă KPI atribuiți"
          description="Un administrator trebuie să-ți atribuie KPI din bibliotecă — din Organizație & Echipă → Atribuiri."
          action={<Button size="sm" onClick={() => router.push(`/${orgSlug}/crm/kpi/atribuiri`)}>Configurează KPI</Button>}
        />
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-[13px] font-semibold text-[var(--ci-text-muted)] uppercase">Prezentare generală</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {kpiuriOrdonate.map((k) => <KpiDashboardCard key={k.atribuireId} kpi={k} />)}
            </div>
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ci-text-muted)] uppercase">
              <Eye className="h-3.5 w-3.5" /> De urmărit
            </h2>
            {restante.length === 0 ? (
              <p className="text-[13px] text-[var(--ci-text-muted)]">Niciun KPI sub țintă — bravo!</p>
            ) : (
              <>
                <p className="mb-2 text-[12px] text-[var(--ci-text-muted)]">KPI-uri sub țintă momentan — nimic grav, doar de ținut un ochi.</p>
                <Card>
                  <div className="space-y-2">
                    {restante.map((k) => (
                      <div key={k.atribuireId} className="flex items-center justify-between gap-3 rounded-[var(--ci-radius-card)] border border-[var(--ci-amber-soft)] bg-[var(--ci-amber-soft)] px-3.5 py-2.5">
                        <p className="text-[13px] font-medium text-[var(--ci-text)]">{k.nume}</p>
                        <p className="ci-tabular text-[13px] text-[var(--ci-amber)]">
                          {k.valoare ?? "—"} / {k.targetNormal}
                          {k.unitate ? ` ${k.unitate}` : ""}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            )}
          </section>

          <section>
            <h2 className="mb-3 flex items-center gap-1.5 text-[13px] font-semibold text-[var(--ci-text-muted)] uppercase">
              <Target className="h-3.5 w-3.5" /> Obiective
            </h2>
            {cuObiectiv.length === 0 ? (
              <p className="text-[13px] text-[var(--ci-text-muted)]">Niciun KPI cu target setat încă.</p>
            ) : (
              <Card>
                <div className="space-y-3">
                  {cuObiectiv.map((k) => (
                    <div key={k.atribuireId}>
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="text-[var(--ci-text)]">{k.nume}</span>
                        <span className="ci-tabular text-[var(--ci-text-muted)]">{k.progres ?? 0}%</span>
                      </div>
                      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-[var(--ci-surface-2)]">
                        <div
                          className={`h-full rounded-full ${k.status === "restant" || k.status === "necesita_atentie" ? "bg-[var(--ci-amber)]" : "bg-[var(--ci-primary)]"}`}
                          style={{ width: `${Math.min(100, k.progres ?? 0)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}
