import Link from "next/link";

import { requireOrgAccess } from "@/lib/auth/guard";
import { GRUPURI_FACEBOOK_HTML } from "@/modules/crm/grupuri-facebook/grupuri-facebook-html";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";

const TITLE = "Împărțire grupuri Facebook";

export default async function GrupuriFacebookPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);

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
        <StandaloneToolFrame html={GRUPURI_FACEBOOK_HTML} title={TITLE} />
      </div>
    </div>
  );
}
