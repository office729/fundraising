import { requireOrgAccess } from "@/lib/auth/guard";
import { PROSPECTARE_HTML } from "@/modules/crm/prospectare/prospectare-html";
import { CrmToolPage } from "../crm/tool-page";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";

const TITLE = "CRM Prospectare Corporate";

export default async function ProspectarePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  return (
    <CrmToolPage orgSlug={orgSlug} access={access}>
      <StandaloneToolFrame html={PROSPECTARE_HTML} title={TITLE} orgSlug={orgSlug} />
    </CrmToolPage>
  );
}
