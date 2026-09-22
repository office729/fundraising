import { requireOrgAccess } from "@/lib/auth/guard";
import { CRM_VOLUNTARI_HTML } from "@/modules/crm/crm-voluntari/crm-voluntari-html";
import { titluPagina } from "@/lib/page-titles";
import { CrmToolPage } from "../crm/tool-page";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";

const TITLE = "CRM Voluntari";

export async function generateMetadata() {
  return { title: await titluPagina("crmVoluntari") };
}

export default async function CrmVoluntariPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  return (
    <CrmToolPage orgSlug={orgSlug} access={access}>
      <StandaloneToolFrame html={CRM_VOLUNTARI_HTML} title={TITLE} orgSlug={orgSlug} orgName={access.orgName} orgLogoUrl={access.orgLogoUrl} />
    </CrmToolPage>
  );
}
