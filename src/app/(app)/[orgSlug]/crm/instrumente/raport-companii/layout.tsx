import { requireOrgAccess } from "@/lib/auth/guard";
import { orgHasToolAccess } from "@/lib/billing/packages";
import { INSTRUMENTE_UI_DICT } from "@/lib/i18n/dictionaries/instrumente-ui";
import { getLocale } from "@/lib/i18n/get-locale";
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
  const t = INSTRUMENTE_UI_DICT[await getLocale()];

  if (!orgHasToolAccess(access.orgPackage, access.orgCustomPlanConfig, "raport-companii")) {
    return <ToolLocked orgSlug={orgSlug} toolName={t.layouts.raportImpact} compact />;
  }

  // Rapoartele conțin sumele sponsorizărilor: le pregătesc doar administratorii. Fără mesaj, un membru ar vedea o pagină care eșuează.
  if (access.role !== "owner" && access.role !== "admin") {
    return (
      <div className="mx-auto max-w-xl rounded-[var(--ci-radius-card)] border border-[var(--ci-border)] bg-[var(--ci-surface)] p-6">
        <h1 className="ci-display text-base font-bold text-[var(--ci-text)]">{t.layouts.raportImpact}</h1>
        <p className="mt-2 text-[13px] text-[var(--ci-text-muted)]">{t.raportCompanii.doarAdmin}</p>
      </div>
    );
  }

  return children;
}
