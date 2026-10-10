import { requireOrgAccess } from "@/lib/auth/guard";
import { titluPagina } from "@/lib/page-titles";
import { COMUNICATE_HTML } from "@/modules/crm/comunicate/comunicate-html";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";

import { CrmToolPage } from "../crm/tool-page";

const TITLE = "Comunicate de presă";

export async function generateMetadata() {
  return { title: await titluPagina("crmComunicate") };
}

export default async function ComunicatePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  return (
    <CrmToolPage orgSlug={orgSlug} access={access}>
      <StandaloneToolFrame html={COMUNICATE_HTML} title={TITLE} orgSlug={orgSlug} />
    </CrmToolPage>
  );
}
