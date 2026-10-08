import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { obtineEchipaManagerAction, obtineOrganizatieDashboardAction } from "../echipa-actions";
import { RapoarteClient } from "../rapoarte-client";

export default async function RapoarteKpiPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const esteAdmin = access.role === "owner" || access.role === "admin";

  // Owner/admin: tot organizația. Ceilalți: doar echipa lor directă (cei pe care îi coordonează).
  if (esteAdmin) {
    const org = await obtineOrganizatieDashboardAction(orgSlug);
    return <RapoarteClient orgSlug={orgSlug} titlu="Raport KPI — întreaga organizație" rezumate={org.echipa} arataDepartamente={org.peDepartament} />;
  }
  const echipa = await obtineEchipaManagerAction(orgSlug);
  return <RapoarteClient orgSlug={orgSlug} titlu={`Raport KPI — echipa mea${echipa.angajatNume ? ` (${echipa.angajatNume})` : ""}`} rezumate={echipa.echipa} arataDepartamente={[]} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmKpiRapoarte");
}
