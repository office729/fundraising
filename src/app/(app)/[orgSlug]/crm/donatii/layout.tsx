import { titluAbsolut } from "@/lib/page-titles";

// Pagina de aici e componentă client (nu poate exporta metadata) — titlul vine
// din acest layout de server.
export async function generateMetadata() {
  return titluAbsolut("crmDonatii");
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
