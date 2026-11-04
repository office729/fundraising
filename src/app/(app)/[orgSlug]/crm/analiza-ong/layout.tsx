import { titluAbsolut } from "@/lib/page-titles";
import { PoartaModul } from "@/modules/crm/shared/poarta-modul";

// Titlul vine din acest layout de server. Analiza ONG-urilor rulează pe contul Anthropic al organizației: modulul „ai-agenti” (pachetul IMPACT și proba gratuită).
export async function generateMetadata() {
  return titluAbsolut("crmAnalizaOng");
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return (
    <PoartaModul orgSlug={orgSlug} modul="ai-agenti">
      {children}
    </PoartaModul>
  );
}
