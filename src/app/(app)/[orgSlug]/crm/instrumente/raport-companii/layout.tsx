import { requireOrgAccess } from "@/lib/auth/guard";
import { orgHasToolAccess } from "@/lib/billing/packages";
import { ToolLocked } from "@/modules/crm/shared/tool-locked";

export default async function RaportCompaniiLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  if (!orgHasToolAccess(access.orgPackage, access.orgCustomPlanConfig, "raport-companii")) {
    return <ToolLocked orgSlug={orgSlug} toolName="Raport activitate companii" compact />;
  }

  return children;
}
