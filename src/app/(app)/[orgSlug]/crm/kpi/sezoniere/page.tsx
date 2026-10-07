import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { listeazaDefinitiiAction } from "../library-actions";
import { listeazaProfiluriSezoniereAction } from "../sezoniere-actions";
import { SezoniereClient } from "../sezoniere-client";

export default async function ProfiluriSezonierePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const [profiluri, definitii] = await Promise.all([listeazaProfiluriSezoniereAction(orgSlug), listeazaDefinitiiAction(orgSlug)]);

  return (
    <SezoniereClient orgSlug={orgSlug} initialProfiluri={profiluri} definitii={definitii} esteAdmin={access.role === "owner" || access.role === "admin"} />
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmKpiSezoniere");
}
