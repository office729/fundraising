import { requireOrgAccess } from "@/lib/auth/guard";
import { CRM_VOLUNTARI_HTML } from "@/modules/crm/crm-voluntari/crm-voluntari-html";
import { CrmToolPage } from "../crm/tool-page";
import { getOrgCustomization } from "@/lib/org-customizations";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";

const TITLE = "CRM Voluntari";

export default async function CrmVoluntariPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  return (
    <CrmToolPage orgSlug={orgSlug} access={access}>
      <StandaloneToolFrame htmlOverride={getOrgCustomization(orgSlug).toolHtml?.["crm-voluntari"]} html={CRM_VOLUNTARI_HTML} title={TITLE} orgSlug={orgSlug} />
    </CrmToolPage>
  );
}
