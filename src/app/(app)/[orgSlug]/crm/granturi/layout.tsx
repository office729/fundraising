import { titluAbsolut } from "@/lib/page-titles";
import { PoartaModul } from "@/modules/crm/shared/poarta-modul";

// Pagina de aici e componentă client (nu poate exporta metadata) — titlul vine din acest layout de server.
export async function generateMetadata() {
  return titluAbsolut("crmGranturi");
}

// Granturile sunt incluse în pachetul IMPACT — vezi MODULE_PACHET în lib/billing/packages.ts.
export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return (
    <PoartaModul orgSlug={orgSlug} modul="granturi">
      {children}
    </PoartaModul>
  );
}
