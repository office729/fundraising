import { redirect } from "next/navigation";

import { paginaCrmAscunsa } from "@/lib/module-ascunse";
import { titluAbsolut } from "@/lib/page-titles";

// Pagina de aici e componentă client (nu poate exporta metadata) — titlul vine
// din acest layout de server.
export async function generateMetadata() {
  return titluAbsolut("crmComunicare");
}

export default async function Layout({ children, params }: { children: React.ReactNode; params: Promise<{ orgSlug: string }> }) {
  if (paginaCrmAscunsa("comunicare")) redirect(`/${(await params).orgSlug}/crm`);
  return children;
}
