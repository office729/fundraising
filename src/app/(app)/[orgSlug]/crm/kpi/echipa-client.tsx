"use client";

import { Users } from "lucide-react";
import { useRouter } from "next/navigation";

import { Breadcrumb } from "../components/ui/breadcrumb";
import { Button } from "../components/ui/button";
import { EmptyState } from "../components/ui/states";
import type { EchipaManager } from "./echipa-actions";
import { EmployeeSummaryCard } from "./employee-summary-card";

export function EchipaClient({ orgSlug, echipa }: { orgSlug: string; echipa: EchipaManager }) {
  const router = useRouter();

  if (!echipa.areProfil) {
    return (
      <div className="mx-auto max-w-[700px]">
        <EmptyState
          icon={Users}
          title="Nu ai încă un profil de angajat"
          description="Un administrator trebuie să te adauge în „Organizație & Echipă” ca să-ți vezi aici echipa."
          action={<Button size="sm" onClick={() => router.push(`/${orgSlug}/crm/organizatie`)}>Vezi Organizație & Echipă</Button>}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <Breadcrumb items={[{ label: "Instrumente", href: `/${orgSlug}/crm/instrumente` }, { label: "KPI Library", href: `/${orgSlug}/crm/kpi` }, { label: "Echipa mea" }]} />

      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Echipa mea</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">Oamenii care îți raportează direct — {echipa.angajatNume}.</p>
      </div>

      {echipa.echipa.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nu ai pe nimeni în subordine încă"
          description="Setează „Manager direct” pentru un coleg, din Organizație & Echipă, ca să apară aici."
          action={<Button size="sm" onClick={() => router.push(`/${orgSlug}/crm/organizatie`)}>Vezi Organizație & Echipă</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {echipa.echipa.map((r) => <EmployeeSummaryCard key={r.angajatId} r={r} />)}
        </div>
      )}
    </div>
  );
}
