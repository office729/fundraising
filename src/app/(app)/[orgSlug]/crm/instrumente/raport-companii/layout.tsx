import { requireOrgAccess } from "@/lib/auth/guard";
import { orgHasToolAccess } from "@/lib/billing/packages";
import { ToolLocked } from "@/modules/crm/shared/tool-locked";

export default async function RaportCompaniiLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  if (!orgHasToolAccess(access.orgPackage, access.orgCustomPlanConfig, "raport-companii")) {
    return <ToolLocked orgSlug={orgSlug} toolName="Rapoarte de impact pentru companii" compact />;
  }

  // Rapoartele conțin sumele sponsorizărilor: le pregătesc doar administratorii. Fără mesaj, un membru ar vedea o pagină care eșuează.
  if (access.role !== "owner" && access.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-6">
        <h1 className="ci-display text-base font-bold text-[var(--ci-text)]">Rapoarte de impact pentru companii</h1>
        <p className="mt-2 text-[13px] text-[var(--ci-text-muted)]">Rapoartele de impact folosesc sumele sponsorizărilor, așa că le pot pregăti doar administratorii organizației. Cere unui administrator să îți dea rolul potrivit sau să pregătească raportul.</p>
      </div>
    );
  }

  return children;
}
