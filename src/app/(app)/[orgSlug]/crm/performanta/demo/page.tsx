import { titluAbsolut } from "@/lib/page-titles";
import { dateDemo } from "@/lib/performanta-demo-date";

import { PrezentareClient } from "../prezentare-client";
import { PaginaDemo } from "./pagina-demo";

export const dynamic = "force-dynamic";

// Exemplu demonstrativ: Prezentare generală, cu date fictive din memorie (nimic din baza de date a organizației).
export default async function DemoPrezentare({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  return (
    <PaginaDemo orgSlug={orgSlug} titlu="Echipă și performanță · exemplu" descriere="O organizație fictivă cu o echipă de șase persoane, ca să vezi cum arată modulul când e folosit.">
      <PrezentareClient orgSlug={orgSlug} d={d.prezentare} />
    </PaginaDemo>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmPerformanta");
}
