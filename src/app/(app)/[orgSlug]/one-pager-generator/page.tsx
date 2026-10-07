import Link from "next/link";

import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";
import { orgHasToolAccess } from "@/lib/billing/packages";
import { ONE_PAGER_DESIGN_RECOMANDAT } from "@/lib/design-template-recommendations";
import { ONE_PAGER_GENERATOR_HTML } from "@/modules/crm/one-pager-generator/one-pager-generator-html";
import { adapteazaOnePagerPentruOrg } from "@/modules/crm/one-pager-generator/adapteaza-org";
import { ToolViewport } from "@/modules/crm/shared/fit-viewport";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";
import { ToolLocked } from "@/modules/crm/shared/tool-locked";

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
    <ToolViewport className="-mx-4 -my-6 flex h-screen flex-col overflow-hidden sm:-mx-6 sm:-my-8">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-panel px-4 py-3 sm:px-6">
        <Link prefetch={false} href={`/${orgSlug}/crm/instrumente`} className="text-[13px] text-muted transition hover:text-ink">
          ← Instrumente
        </Link>
        <span className="text-line">/</span>
        <h1 className="font-display text-sm font-semibold text-ink">{TITLE}</h1>
      </header>
      <div className="min-h-0 flex-1">
        <StandaloneToolFrame
          html={adapteazaOnePagerPentruOrg(ONE_PAGER_GENERATOR_HTML, orgSlug, access.orgName)}
          title={TITLE}
          orgSlug={orgSlug}
          orgName={access.orgName}
          domeniuActivitate={access.orgDomeniuActivitate}
          designRecomandat={access.orgDomeniuActivitate ? ONE_PAGER_DESIGN_RECOMANDAT[access.orgDomeniuActivitate] : []}
        />
      </div>
    </ToolViewport>
  );
}
