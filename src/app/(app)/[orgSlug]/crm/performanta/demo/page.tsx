import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { titluAbsolut } from "@/lib/page-titles";
import { dateDemo } from "@/lib/performanta-demo-date";

import { PrezentareClient } from "../prezentare-client";
import { PaginaDemo } from "./pagina-demo";

export const dynamic = "force-dynamic";

// Exemplu demonstrativ: Prezentare generală, cu date fictive din memorie (nimic din baza de date a organizației).
export default async function DemoPrezentare({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  const p = PERFORMANTA_UI_DICT[await getLocale()].demo.prezentare;
  return (
    <PaginaDemo orgSlug={orgSlug} titlu={p.titlu} descriere={p.descriere}>
      <PrezentareClient orgSlug={orgSlug} d={d.prezentare} />
    </PaginaDemo>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmPerformanta");
}
