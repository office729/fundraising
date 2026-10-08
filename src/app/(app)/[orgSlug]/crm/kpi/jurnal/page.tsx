import { redirect } from "next/navigation";

import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { listeazaJurnalAction } from "../jurnal-actions";
import { JurnalClient } from "../jurnal-client";

export default async function JurnalKpiPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  if (access.role !== "owner" && access.role !== "admin") redirect(`/${orgSlug}/crm/kpi`);
  const intrari = await listeazaJurnalAction(orgSlug);
  return <JurnalClient orgSlug={orgSlug} intrari={intrari} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmKpiJurnal");
}