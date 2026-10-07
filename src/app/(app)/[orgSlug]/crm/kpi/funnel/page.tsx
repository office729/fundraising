import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { FunnelClient } from "../funnel-client";
import { listeazaFunnelsAction } from "../funnel-actions";

export default async function FunnelPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const funnels = await listeazaFunnelsAction(orgSlug);

  return <FunnelClient orgSlug={orgSlug} initialFunnels={funnels} esteAdmin={access.role === "owner" || access.role === "admin"} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmKpiFunnel");
}
