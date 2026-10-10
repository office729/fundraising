import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";
import { orgHasToolAccess } from "@/lib/billing/packages";
import { ONE_PAGER_DESIGN_RECOMANDAT } from "@/lib/design-template-recommendations";
import { ONE_PAGER_GENERATOR_HTML } from "@/modules/crm/one-pager-generator/one-pager-generator-html";
import { adapteazaOnePagerPentruOrg } from "@/modules/crm/one-pager-generator/adapteaza-org";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";
import { ToolLocked } from "@/modules/crm/shared/tool-locked";

import { CrmToolPage } from "../crm/tool-page";

const TITLE = "Generator one-pager";

export async function generateMetadata() {
  return titluAbsolut("crmOnePager");
}

export default async function OnePagerGeneratorPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  if (!orgHasToolAccess(access.orgPackage, access.orgCustomPlanConfig, "one-pager-generator")) {
    return <ToolLocked orgSlug={orgSlug} toolName={TITLE} />;
  }

  return (
    <CrmToolPage orgSlug={orgSlug} access={access}>
      <StandaloneToolFrame
            html={adapteazaOnePagerPentruOrg(ONE_PAGER_GENERATOR_HTML, orgSlug, access.orgName)}
            title={TITLE}
            orgSlug={orgSlug}
            orgName={access.orgName}
            domeniuActivitate={access.orgDomeniuActivitate}
            designRecomandat={access.orgDomeniuActivitate ? ONE_PAGER_DESIGN_RECOMANDAT[access.orgDomeniuActivitate] : []}
          />
    </CrmToolPage>
  );
}
