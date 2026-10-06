import { listeazaDepartamenteAccesibileAction, obtineDepartamentDashboardAction } from "../echipa-actions";
import { DepartamentClient } from "../departament-client";
import { titluAbsolut } from "@/lib/page-titles";

export default async function DepartamentPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const departamente = await listeazaDepartamenteAccesibileAction(orgSlug);
  const initialDepartamentId = departamente[0]?.id ?? null;
  const initial = initialDepartamentId ? await obtineDepartamentDashboardAction(orgSlug, initialDepartamentId) : null;

  return <DepartamentClient orgSlug={orgSlug} departamente={departamente} initialDepartamentId={initialDepartamentId} initial={initial} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmKpiDepartament");
}
