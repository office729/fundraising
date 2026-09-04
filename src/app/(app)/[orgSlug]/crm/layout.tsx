import { requireOrgAccess } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";

import "./calm-impact.css";
import { CrmShell } from "./shell";

export default async function CrmLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const locale = await getLocale();

  return (
    <CrmShell
      orgSlug={orgSlug}
      orgName={access.orgName}
      orgLogoUrl={access.orgLogoUrl}
      orgBrandColor={access.orgBrandColor}
      userName={access.userName ?? access.userEmail}
      locale={locale}
    >
      {children}
    </CrmShell>
  );
}
