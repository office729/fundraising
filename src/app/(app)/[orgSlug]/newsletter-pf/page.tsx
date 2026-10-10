import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";
import { orgHasToolAccess } from "@/lib/billing/packages";
import { NEWSLETTER_PF_DESIGN_RECOMANDAT } from "@/lib/design-template-recommendations";
import { NEWSLETTER_PF_HTML } from "@/modules/crm/newsletter-pf/newsletter-pf-html";
import { neutralizeazaLinkuriPilot } from "@/modules/crm/shared/neutralizeaza-pilot";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";
import { ToolLocked } from "@/modules/crm/shared/tool-locked";

import { CrmToolPage } from "../crm/tool-page";
import { NewsletterPagina } from "../newsletter-pagina";

const TITLE = "Generator newsletter — persoane fizice";

export async function generateMetadata() {
  return titluAbsolut("crmNewsletterPf");
}

export default async function NewsletterPfPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  if (!orgHasToolAccess(access.orgPackage, access.orgCustomPlanConfig, "newsletter-pf")) {
    return <ToolLocked orgSlug={orgSlug} toolName={TITLE} />;
  }

  return (
    <CrmToolPage orgSlug={orgSlug} access={access}>
      <NewsletterPagina tip="pf">
        <StandaloneToolFrame
              html={neutralizeazaLinkuriPilot(NEWSLETTER_PF_HTML, orgSlug)}
              title={TITLE}
              orgSlug={orgSlug}
              orgName={access.orgName}
              domeniuActivitate={access.orgDomeniuActivitate}
              designRecomandat={access.orgDomeniuActivitate ? NEWSLETTER_PF_DESIGN_RECOMANDAT[access.orgDomeniuActivitate] : []}
            />
      </NewsletterPagina>
    </CrmToolPage>
  );
}
