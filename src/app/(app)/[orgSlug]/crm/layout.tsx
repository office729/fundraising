import { requireOrgAccess } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";
import { titluAbsolut } from "@/lib/page-titles";

import "./calm-impact.css";
import { CrmShell } from "./shell";

// Titlul de aici e pentru pagina de start a CRM (crm/page.tsx, componentă
// client — nu poate exporta propriul generateMetadata). Fiecare subpagină cu
// titlu mai specific (donatori, companii etc.) îl suprascrie prin propriul
// layout.tsx sau, unde pagina e server component, direct din page.tsx.
export async function generateMetadata() {
  return titluAbsolut("crmAcasa");
}

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
      orgDomeniuActivitate={access.orgDomeniuActivitate}
      userName={access.userName ?? access.userEmail}
      locale={locale}
    >
      {children}
    </CrmShell>
  );
}
