import { obtineDashboardPersonalAction } from "../dashboard-actions";
import { DashboardClient } from "../dashboard-client";

export default async function KpiDashboardPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const dashboard = await obtineDashboardPersonalAction(orgSlug);

  return <DashboardClient orgSlug={orgSlug} dashboard={dashboard} />;
}
