import { titluAbsolut } from "@/lib/page-titles";

// Titlul vine din acest layout de server. „Statistici și surse” e disponibil în toate pachetele (fără poartă de modul).
export async function generateMetadata() {
  return titluAbsolut("crmSurse");
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
