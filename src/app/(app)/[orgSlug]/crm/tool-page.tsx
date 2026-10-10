import type { ReactNode } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";
import { FitCrmShell } from "@/modules/crm/shared/fit-viewport";

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
      orgDomeniuActivitate={access.orgDomeniuActivitate}
      userName={access.userName ?? access.userEmail}
      role={access.role}
      locale={locale}
    >
      {/* Instrumentul ocupă tot ecranul: bara de sus a organizației și bannerul nu se mai afișează aici, iar marginile paginii dispar. */}
      <style>{"[data-org-chrome]{display:none!important}#continut{padding:0!important}"}</style>
      <FitCrmShell />
      <div className="absolute inset-0">{children}</div>
    </CrmShell>
  );
}
