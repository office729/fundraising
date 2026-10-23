import { cookies } from "next/headers";

import type { DomeniuActivitate } from "@/lib/campaign-templates";
import { requireOrgAccess } from "@/lib/auth/guard";
import { isPlatformAdmin, pachetPentruModule } from "@/lib/billing/trial";
import { getLocale } from "@/lib/i18n/get-locale";
import { titluAbsolut } from "@/lib/page-titles";
import { COOKIE_PREVIZUALIZARE, ORG_DEMO_SLUG, decodeazaStare } from "@/lib/previzualizare";
import { citesteOrgPentruPersonalizare } from "@/lib/suport/personalizare-admin";

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
  let personalizare = await citestePersonalizareOrg(orgSlug);
  let orgName = access.orgName;
  let orgLogoUrl = access.orgLogoUrl;
  let orgDomeniuActivitate = access.orgDomeniuActivitate;
  let orgPackage = access.orgPackage;
  let pachetModule = pachetPentruModule(access.orgPackage, access.userEmail);

  // Previzualizarea navigabilă de suport (vezi lib/previzualizare.ts): doar pentru un administrator al platformei și doar pe organizația demo, paginile reale
  // rulează cu aspectul altei organizații (nume, siglă, pachet, meniu, blocuri). Orice altă combinație ignoră cookie-ul.
  let previzualizare: string | null = null;
  if (orgSlug === ORG_DEMO_SLUG && isPlatformAdmin(access.userEmail)) {
    const cod = (await cookies()).get(COOKIE_PREVIZUALIZARE)?.value;
    const stare = cod ? decodeazaStare(cod) : null;
    const tinta = stare ? await citesteOrgPentruPersonalizare(stare.slug) : null;
    if (stare && tinta) {
      previzualizare = tinta.nume;
      personalizare = stare.config ?? tinta.config;
      orgName = tinta.nume;
      orgLogoUrl = tinta.logoUrl;
      orgDomeniuActivitate = tinta.domeniuActivitate as DomeniuActivitate | null;
      orgPackage = tinta.package;
      pachetModule = tinta.package;
    }
  }

  return (
    <>
      {previzualizare && (
        <div role="status" className="border-b border-line bg-amber-50 px-4 py-2 text-center text-[13px] text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <strong>Previzualizare de suport</strong> · aspectul organizației {previzualizare}, pe organizația demo · datele sunt de test, nu ale clientului ·{" "}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- e un route handler care șterge cookie-ul: <Link> l-ar prefetcha (și ar ieși din previzualizare la simplul hover) */}
          <a href="/platform-admin/iesire-previzualizare" className="font-semibold underline">
            Ieși din previzualizare
          </a>
        </div>
      )}
      <CrmShell
        orgSlug={orgSlug}
        orgName={orgName}
        orgLogoUrl={orgLogoUrl}
        orgDomeniuActivitate={orgDomeniuActivitate}
        orgPackage={orgPackage}
        pachetModule={pachetModule}
        userName={access.userName ?? access.userEmail}
        role={access.role}
        locale={locale}
        personalizare={personalizare}
      >
        {children}
      </CrmShell>
    </>
  );
}
