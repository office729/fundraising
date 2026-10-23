import { requireOrgAccess } from "@/lib/auth/guard";
import { pachetPentruModule } from "@/lib/billing/trial";
import { getLocale } from "@/lib/i18n/get-locale";
import { titluAbsolut } from "@/lib/page-titles";

import "./calm-impact.css";
import { citestePersonalizareOrg } from "./personalizare-actions";
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
  // Aspectul personalizat de echipa platformei (meniu, blocuri de pe prima pagină); null = aspect standard.
  const personalizare = await citestePersonalizareOrg(orgSlug);

  return (
    <CrmShell
      orgSlug={orgSlug}
      orgName={access.orgName}
      orgLogoUrl={access.orgLogoUrl}
      orgDomeniuActivitate={access.orgDomeniuActivitate}
      orgPackage={access.orgPackage}
      pachetModule={pachetPentruModule(access.orgPackage, access.userEmail)}
      userName={access.userName ?? access.userEmail}
      role={access.role}
      locale={locale}
      personalizare={personalizare}
    >
      {children}
    </CrmShell>
  );
}
