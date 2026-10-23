"use client";

import Image from "next/image";

import { CrmShell } from "@/app/(app)/[orgSlug]/crm/shell";
import { DashboardAcasa } from "@/app/(app)/[orgSlug]/crm/dashboard-acasa";
import type { DomeniuActivitate } from "@/lib/campaign-templates";
import type { Locale } from "@/lib/i18n/config";
import type { PersonalizareOrg } from "@/lib/personalizare-org";

// Dashboardul unei organizații, cu aspectul ei și cu date de exemplu. Linkurile sunt oprite: pagina organizației nu există pentru echipa platformei (404), iar
// previzualizarea nu trebuie să ducă niciodată spre date reale.
export function PrevizualizareOrg({
  org,
  config,
  nesalvat,
  locale,
}: {
  org: { slug: string; nume: string; logoUrl: string | null; domeniuActivitate: DomeniuActivitate | null; pachet: "trial" | "start" | "crestere" | "impact" | "custom" };
  config: PersonalizareOrg | null;
  nesalvat: boolean;
  locale: Locale;
}) {
  const initiale =
    (org.nume.match(/\p{L}+/gu) ?? [])
      .slice(0, 2)
      .map((cuvant) => cuvant[0]?.toUpperCase())
      .join("") || "ONG";

  return (
    <div
      className="min-h-screen bg-canvas"
      onClickCapture={(e) => {
        // Linkuri (spre pagini care nu există pentru echipa platformei) și formulare (în special „Deconectare” din meniul contului): oprite în previzualizare.
        if ((e.target as HTMLElement).closest("a[href], form")) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <div role="status" className="border-b border-line bg-amber-50 px-4 py-2 text-center text-[13px] text-amber-900 dark:bg-amber-950 dark:text-amber-200">
        <strong>Previzualizare de suport</strong> · {org.nume} · cifrele, donatorii și campaniile sunt <strong>exemple</strong>, nu datele organizației ·{" "}
        {nesalvat ? "configurare nesalvată" : "configurare salvată"}
      </div>
      <header className="border-b border-line bg-panel">
        <div className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
          {org.logoUrl ? (
            <Image src={org.logoUrl} alt="" width={36} height={36} unoptimized className="h-9 w-9 shrink-0 rounded-lg border border-line bg-white object-contain" />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-display text-sm font-bold text-white" style={{ backgroundColor: "var(--brand-solid)" }}>
              {initiale}
            </span>
          )}
          <p className="truncate font-display text-base leading-none font-semibold text-brand-blue">{org.nume}</p>
        </div>
      </header>
      <CrmShell
        orgSlug={org.slug}
        orgName={org.nume}
        orgLogoUrl={org.logoUrl}
        orgDomeniuActivitate={org.domeniuActivitate}
        orgPackage={org.pachet}
        pachetModule={org.pachet}
        userName="Utilizator exemplu"
        role="owner"
        locale={locale}
        personalizare={config}
        previzualizare
      >
        <DashboardAcasa orgSlug={org.slug} previzualizare />
      </CrmShell>
    </div>
  );
}
