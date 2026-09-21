import { titluPagina } from "@/lib/page-titles";

// Pagina de aici e componentă client (nu poate exporta metadata) — titlul vine
// din acest layout de server, ca să apară corect în tab și în Google Analytics.
export async function generateMetadata() {
  return { title: await titluPagina("signup") };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
