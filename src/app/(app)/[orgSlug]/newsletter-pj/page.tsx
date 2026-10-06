import Link from "next/link";

import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";
import { orgHasToolAccess } from "@/lib/billing/packages";
import { NEWSLETTER_PJ_DESIGN_RECOMANDAT } from "@/lib/design-template-recommendations";
import { NEWSLETTER_PJ_HTML } from "@/modules/crm/newsletter-pj/newsletter-pj-html";
import { ToolViewport } from "@/modules/crm/shared/fit-viewport";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";
import { ToolLocked } from "@/modules/crm/shared/tool-locked";

const TITLE = "Generator newsletter — persoane juridice";

export async function generateMetadata() {
  return titluAbsolut("crmNewsletterPj");
}

export default async function NewsletterPjPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  if (!orgHasToolAccess(access.orgPackage, access.orgCustomPlanConfig, "newsletter-pj")) {
    return <ToolLocked orgSlug={orgSlug} toolName={TITLE} />;
  }

  return (
    <ToolViewport className="relative left-1/2 -ml-[50vw] flex h-screen w-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-panel px-4 py-3 sm:px-6">
        <Link prefetch={false} href={`/${orgSlug}/crm/instrumente`} className="text-[13px] text-muted transition hover:text-ink">
          ← Instrumente
        </Link>
        <span className="text-line">/</span>
        <span className="font-display text-sm font-semibold text-ink">{TITLE}</span>
      </header>
      <div className="min-h-0 flex-1">
        <StandaloneToolFrame
          html={NEWSLETTER_PJ_HTML}
          title={TITLE}
          orgSlug={orgSlug}
          domeniuActivitate={access.orgDomeniuActivitate}
          designRecomandat={access.orgDomeniuActivitate ? NEWSLETTER_PJ_DESIGN_RECOMANDAT[access.orgDomeniuActivitate] : []}
        />
      </div>
    </ToolViewport>
  );
}
