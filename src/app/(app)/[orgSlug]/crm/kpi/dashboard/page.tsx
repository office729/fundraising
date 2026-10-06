import { obtineDashboardPersonalAction } from "../dashboard-actions";
import { DashboardClient } from "../dashboard-client";
import { titluAbsolut } from "@/lib/page-titles";

export default async function KpiDashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const dashboard = await obtineDashboardPersonalAction(orgSlug);

  return <DashboardClient orgSlug={orgSlug} dashboard={dashboard} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmKpiDashboard");
}
