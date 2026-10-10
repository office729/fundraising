import { requireOrgAccess } from "@/lib/auth/guard";
import { titluPagina } from "@/lib/page-titles";
import { GRUPURI_FACEBOOK_HTML } from "@/modules/crm/grupuri-facebook/grupuri-facebook-html";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";

import { CrmToolPage } from "../crm/tool-page";

const TITLE = "Împărțire grupuri Facebook";

export async function generateMetadata() {
  return { title: await titluPagina("crmGrupuriFacebook") };
}

export default async function GrupuriFacebookPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  return (
    <CrmToolPage orgSlug={orgSlug} access={access}>
      <StandaloneToolFrame html={GRUPURI_FACEBOOK_HTML} title={TITLE} orgSlug={orgSlug} />
    </CrmToolPage>
  );
}
