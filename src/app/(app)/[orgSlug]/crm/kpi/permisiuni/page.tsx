import { redirect } from "next/navigation";

import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { obtinePermisiuniAction } from "../permisiuni-actions";
import { PermisiuniClient } from "../permisiuni-client";

export default async function PermisiuniKpiPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  if (access.role !== "owner" && access.role !== "admin") redirect(`/${orgSlug}/crm/kpi`);
  const permisiuni = await obtinePermisiuniAction(orgSlug);
  return <PermisiuniClient orgSlug={orgSlug} initial={permisiuni} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmKpiPermisiuni");
}