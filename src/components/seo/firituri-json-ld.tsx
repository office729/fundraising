import { JsonLd } from "@/components/seo/json-ld";
import { titluPagina, type PaginaCuTitlu } from "@/lib/page-titles";
import { schemaFiriturie } from "@/lib/seo-schema";

// Firimiturile de navigare ale unei pagini publice (Acasă › pagina), în limba vizitatorului.
export async function FirituriJsonLd({ pagina, cale }: { pagina: PaginaCuTitlu; cale: string }) {
  return <JsonLd date={schemaFiriturie({ nume: await titluPagina(pagina), cale })} />;
}
