import Link from "next/link";

import { requireOrgAccess } from "@/lib/auth/guard";
import { orgHasToolAccess } from "@/lib/billing/packages";
import { PROGRAM_LUCRU_HTML } from "@/modules/crm/program-lucru/program-lucru-html";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";
import { ToolLocked } from "@/modules/crm/shared/tool-locked";

const TITLE = "Program de lucru pe cazuri";

export default async function ProgramLucruPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  if (!orgHasToolAccess(access.orgPackage, access.orgCustomPlanConfig, "program-lucru")) {
    return <ToolLocked orgSlug={orgSlug} toolName={TITLE} />;
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-panel px-4 py-3 sm:px-6">
        <Link href={`/${orgSlug}/crm/instrumente`} className="text-[13px] text-muted transition hover:text-ink">
          ← Instrumente
        </Link>
        <span className="text-line">/</span>
        <span className="font-display text-sm font-semibold text-ink">{TITLE}</span>
      </header>
      <div className="min-h-0 flex-1">
        <StandaloneToolFrame html={PROGRAM_LUCRU_HTML} title={TITLE} orgSlug={orgSlug} />
      </div>
    </div>
  );
}
