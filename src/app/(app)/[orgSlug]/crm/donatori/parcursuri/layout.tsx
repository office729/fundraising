import { titluAbsolut } from "@/lib/page-titles";
import { PoartaModul } from "@/modules/crm/shared/poarta-modul";

export async function generateMetadata() {
  return titluAbsolut("crmDonatoriParcursuri");
}

// Parcursurile pentru donatori sunt incluse din pachetul CREȘTERE — vezi MODULE_PACHET în lib/billing/packages.ts.
export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return (
    <PoartaModul orgSlug={orgSlug} modul="parcursuri-donatori">
      {children}
    </PoartaModul>
  );
}
