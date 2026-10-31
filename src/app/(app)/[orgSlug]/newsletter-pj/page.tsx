import { requireOrgAccess } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";
import { titluAbsolut } from "@/lib/page-titles";
import { orgHasToolAccess } from "@/lib/billing/packages";
import { NEWSLETTER_PJ_DESIGN_RECOMANDAT } from "@/lib/design-template-recommendations";
import { NEWSLETTER_PJ_HTML } from "@/modules/crm/newsletter-pj/newsletter-pj-html";
import { neutralizeazaLinkuriPilot } from "@/modules/crm/shared/neutralizeaza-pilot";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";
import { ToolLocked } from "@/modules/crm/shared/tool-locked";

import { CrmToolPage } from "../crm/tool-page";
import { NewsletterPagina } from "../newsletter-pagina";

const TITLE = { ro: "Generator newsletter — persoane juridice", en: "Newsletter generator — companies" } as const;

export async function generateMetadata() {
  return titluAbsolut("crmNewsletterPj");
}

export default async function NewsletterPjPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const title = TITLE[await getLocale()];

  if (!orgHasToolAccess(access.orgPackage, access.orgCustomPlanConfig, "newsletter-pj")) {
    return <ToolLocked orgSlug={orgSlug} toolName={title} />;
  }

  return (
    <CrmToolPage orgSlug={orgSlug} access={access}>
      <NewsletterPagina tip="pj">
        <StandaloneToolFrame
              html={neutralizeazaLinkuriPilot(NEWSLETTER_PJ_HTML, orgSlug)}
              title={title}
              orgSlug={orgSlug}
              orgName={access.orgName}
              orgLogoUrl={access.orgLogoUrl}
              domeniuActivitate={access.orgDomeniuActivitate}
              designRecomandat={access.orgDomeniuActivitate ? NEWSLETTER_PJ_DESIGN_RECOMANDAT[access.orgDomeniuActivitate] : []}
            />
      </NewsletterPagina>
    </CrmToolPage>
  );
}
