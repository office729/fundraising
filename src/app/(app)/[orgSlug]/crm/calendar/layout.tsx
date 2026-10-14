import { titluAbsolut } from "@/lib/page-titles";
import { PoartaModul } from "@/modules/crm/shared/poarta-modul";

// Titlul vine din acest layout de server; calendarul e inclus în pachetul IMPACT — vezi MODULE_PACHET în lib/billing/packages.ts.
export async function generateMetadata() {
  return titluAbsolut("crmCalendar");
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return (
    <PoartaModul orgSlug={orgSlug} modul="calendar">
      {children}
    </PoartaModul>
  );
}
