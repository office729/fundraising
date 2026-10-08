import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { obtineStareOnboardingAction } from "../onboarding-actions";
import { OnboardingClient } from "../onboarding-client";

export default async function StartKpiPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const stare = await obtineStareOnboardingAction(orgSlug);
  return <OnboardingClient orgSlug={orgSlug} stare={stare} esteAdmin={access.role === "owner" || access.role === "admin"} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmKpiStart");
}