import { redirect } from "next/navigation";

import { requireOrgAccess } from "@/lib/auth/guard";

import { obtineOrganizatieDashboardAction } from "../echipa-actions";
import { OrganizatieDashboardClient } from "../organizatie-dashboard-client";

export default async function OrganizatieDashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  if (access.role !== "owner" && access.role !== "admin") {
    redirect(`/${orgSlug}/crm/kpi`);
  }
  const dashboard = await obtineOrganizatieDashboardAction(orgSlug);

  return <OrganizatieDashboardClient orgSlug={orgSlug} dashboard={dashboard} />;
}
