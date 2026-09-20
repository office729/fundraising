import type { ReactNode } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";

import "./calm-impact.css";
import { CrmShell } from "./shell";

type Access = Awaited<ReturnType<typeof requireOrgAccess>>;

// Instrument HTML (rulat într-un iframe) afișat ÎN interiorul CRM-ului: același
// meniu lateral cu „Acasă" ca pe restul paginilor, iar instrumentul umple tot
// spațiul din dreapta meniului.
export async function CrmToolPage({ orgSlug, access, children }: { orgSlug: string; access: Access; children: ReactNode }) {
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
      <div className="absolute inset-0">{children}</div>
    </CrmShell>
  );
}
