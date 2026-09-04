import Link from "next/link";

import { requireOrgAccess } from "@/lib/auth/guard";
import { Editor } from "@/modules/crm/crm-pj/components/editor";

export default async function CrmPjPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const userName = access.userName || access.userEmail;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex shrink-0 items-center gap-3 border-b border-line bg-panel px-4 py-3 sm:px-6">
        <Link href={`/${orgSlug}`} className="text-[13px] text-muted transition hover:text-ink">
          ← Instrumentele tale
        </Link>
        <span className="text-line">/</span>
        <span className="font-display text-sm font-semibold text-ink">CRM Persoane Juridice</span>
      </header>
      <div className="min-h-0 flex-1">
        <Editor orgSlug={orgSlug} orgRole={access.role} userName={userName} />
      </div>
    </div>
  );
}
