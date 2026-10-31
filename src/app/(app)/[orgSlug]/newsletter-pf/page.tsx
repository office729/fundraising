import { requireOrgAccess } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";
import { titluAbsolut } from "@/lib/page-titles";
import { orgHasToolAccess } from "@/lib/billing/packages";
import { NEWSLETTER_PF_DESIGN_RECOMANDAT } from "@/lib/design-template-recommendations";
import { NEWSLETTER_PF_HTML } from "@/modules/crm/newsletter-pf/newsletter-pf-html";
import { neutralizeazaLinkuriPilot } from "@/modules/crm/shared/neutralizeaza-pilot";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";
import { ToolLocked } from "@/modules/crm/shared/tool-locked";

import { CrmToolPage } from "../crm/tool-page";
import { NewsletterPagina } from "../newsletter-pagina";

const TITLE = { ro: "Generator newsletter — persoane fizice", en: "Newsletter generator — individuals" } as const;

export async function generateMetadata() {
  return titluAbsolut("crmNewsletterPf");
}

export default async function NewsletterPfPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const title = TITLE[await getLocale()];

  if (!orgHasToolAccess(access.orgPackage, access.orgCustomPlanConfig, "newsletter-pf")) {
    return <ToolLocked orgSlug={orgSlug} toolName={title} />;
  }

  return (
    <CrmToolPage orgSlug={orgSlug} access={access}>
      <NewsletterPagina tip="pf">
        <StandaloneToolFrame
              html={neutralizeazaLinkuriPilot(NEWSLETTER_PF_HTML, orgSlug)}
              title={title}
              orgSlug={orgSlug}
              orgName={access.orgName}
              orgLogoUrl={access.orgLogoUrl}
              domeniuActivitate={access.orgDomeniuActivitate}
              designRecomandat={access.orgDomeniuActivitate ? NEWSLETTER_PF_DESIGN_RECOMANDAT[access.orgDomeniuActivitate] : []}
            />
      </NewsletterPagina>
    </CrmToolPage>
  );
}
