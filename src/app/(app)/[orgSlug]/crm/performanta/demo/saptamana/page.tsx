import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { dateDemo } from "@/lib/performanta-demo-date";

import { SaptamanaClient } from "../../saptamana-client";
import { PaginaDemo } from "../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoSaptamana({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  const p = PERFORMANTA_UI_DICT[await getLocale()].demo.saptamana;
  return (
    <PaginaDemo orgSlug={orgSlug} titlu={p.titlu} descriere={p.descriere} latime={1500}>
      <SaptamanaClient orgSlug={orgSlug} d={d.saptamana} />
    </PaginaDemo>
  );
}
