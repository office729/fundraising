import { titluAbsolut } from "@/lib/page-titles";
import { PoartaModul } from "@/modules/crm/shared/poarta-modul";

// Titlul vine din acest layout de server. Influencerii sunt incluși din pachetul IMPACT (și în proba gratuită) — vezi MODULE_PACHET.
export async function generateMetadata() {
  return titluAbsolut("crmInfluenceri");
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return (
    <PoartaModul orgSlug={orgSlug} modul="influenceri">
      {children}
    </PoartaModul>
  );
}
