import { requireOrgAccess } from "@/lib/auth/guard";
import { orgHasToolAccess } from "@/lib/billing/packages";
import { PROGRAM_LUCRU_HTML } from "@/modules/crm/program-lucru/program-lucru-html";
import { CrmToolPage } from "../crm/tool-page";
import { getOrgCustomization } from "@/lib/org-customizations";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";
import { ToolLocked } from "@/modules/crm/shared/tool-locked";

const TITLE = "Program de lucru pe cazuri";

export default async function ProgramLucruPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  if (!orgHasToolAccess(access.orgPackage, access.orgCustomPlanConfig, "program-lucru")) {
    return <ToolLocked orgSlug={orgSlug} toolName={TITLE} />;
  }

  return (
    <CrmToolPage orgSlug={orgSlug} access={access}>
      <StandaloneToolFrame htmlOverride={getOrgCustomization(orgSlug).toolHtml?.["program-lucru"]} html={PROGRAM_LUCRU_HTML} title={TITLE} orgSlug={orgSlug} />
    </CrmToolPage>
  );
}
