import Link from "next/link";

import { requireOrgAccess } from "@/lib/auth/guard";
import { titluPagina } from "@/lib/page-titles";
import { COMUNICATE_HTML } from "@/modules/crm/comunicate/comunicate-html";
import { StandaloneToolFrame } from "@/modules/crm/shared/standalone-tool-frame";

const TITLE = "Comunicate de presă";

export async function generateMetadata() {
  return { title: await titluPagina("crmComunicate") };
}

export default async function ComunicatePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-panel px-4 py-3 sm:px-6">
        <Link prefetch={false} href={`/${orgSlug}/crm/instrumente`} className="text-[13px] text-muted transition hover:text-ink">
          ← Instrumente
        </Link>
        <span className="text-line">/</span>
        <h1 className="font-display text-sm font-semibold text-ink">{TITLE}</h1>
      </header>
      <div className="min-h-0 flex-1">
        <StandaloneToolFrame html={COMUNICATE_HTML} title={TITLE} orgSlug={orgSlug} />
      </div>
    </div>
  );
}
