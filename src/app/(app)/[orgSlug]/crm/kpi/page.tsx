import { requireOrgAccess } from "@/lib/auth/guard";

import { pasiKpiFacuti } from "@/lib/kpi-onboarding";

import { listeazaCategoriiAction, listeazaDefinitiiAction } from "./library-actions";
import { obtineStareOnboardingAction } from "./onboarding-actions";
import { KpiLibraryClient } from "./kpi-library-client";
import { titluAbsolut } from "@/lib/page-titles";

export default async function KpiLibraryPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const esteAdmin = access.role === "owner" || access.role === "admin";
  const [categorii, definitii, stare] = await Promise.all([listeazaCategoriiAction(orgSlug), listeazaDefinitiiAction(orgSlug), esteAdmin ? obtineStareOnboardingAction(orgSlug) : Promise.resolve(null)]);

  return (
    <KpiLibraryClient orgSlug={orgSlug} initialCategorii={categorii} initialDefinitii={definitii} esteAdmin={esteAdmin} pasiFacuti={stare ? pasiKpiFacuti(stare) : null} />
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmKpiLibrary");
}
