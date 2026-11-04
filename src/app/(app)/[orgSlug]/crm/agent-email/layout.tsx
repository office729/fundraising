import { titluAbsolut } from "@/lib/page-titles";
import { PoartaModul } from "@/modules/crm/shared/poarta-modul";

// Titlul vine din acest layout de server. Agentul email e inclus din pachetul IMPACT (modulul „ai-agenti”, ca restul agenților AI pe contul organizației); pachetul se verifică pe server și în acțiuni.
export async function generateMetadata() {
  return titluAbsolut("crmAgentEmail");
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  return (
    <PoartaModul orgSlug={orgSlug} modul="ai-agenti">
      {children}
    </PoartaModul>
  );
}
