import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { dateDemo } from "@/lib/performanta-demo-date";

import { SabloaneClient } from "../../sabloane-client";
import { PaginaDemo } from "../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoSabloane({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  const p = PERFORMANTA_UI_DICT[await getLocale()].demo.sabloane;
  return (
    <PaginaDemo orgSlug={orgSlug} titlu={p.titlu} descriere={p.descriere} latime={1100}>
      <SabloaneClient orgSlug={orgSlug} sabloane={d.sabloane} referinte={d.referinte} admin />
    </PaginaDemo>
  );
}
