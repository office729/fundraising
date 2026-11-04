import { titluAbsolut } from "@/lib/page-titles";

// Titlul vine din acest layout de server. Consum AI e disponibil în toate pachetele (contul Anthropic e al organizației); pagina însăși e doar pentru administratori.
export async function generateMetadata() {
  return titluAbsolut("crmConsumAi");
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
