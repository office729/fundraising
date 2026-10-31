import { requireOrgAccess } from "@/lib/auth/guard";
import { orgHasToolAccess } from "@/lib/billing/packages";
import { INSTRUMENTE_UI_DICT } from "@/lib/i18n/dictionaries/instrumente-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { ToolLocked } from "@/modules/crm/shared/tool-locked";

export default async function OnePagerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);

  if (!orgHasToolAccess(access.orgPackage, access.orgCustomPlanConfig, "one-pager")) {
    return <ToolLocked orgSlug={orgSlug} toolName={INSTRUMENTE_UI_DICT[await getLocale()].layouts.onePager} compact />;
  }

  return children;
}
