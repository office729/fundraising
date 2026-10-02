import { requireOrgAccess } from "@/lib/auth/guard";

import { listeazaCategoriiAction, listeazaDefinitiiAction } from "./library-actions";
import { KpiLibraryClient } from "./kpi-library-client";

export default async function KpiLibraryPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const [categorii, definitii] = await Promise.all([listeazaCategoriiAction(orgSlug), listeazaDefinitiiAction(orgSlug)]);

  return (
    <KpiLibraryClient orgSlug={orgSlug} initialCategorii={categorii} initialDefinitii={definitii} esteAdmin={access.role === "owner" || access.role === "admin"} />
  );
}
