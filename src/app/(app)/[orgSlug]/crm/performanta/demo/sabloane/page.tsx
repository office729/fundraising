import { dateDemo } from "@/lib/performanta-demo-date";

import { SabloaneClient } from "../../sabloane-client";
import { PaginaDemo } from "../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoSabloane({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  return (
    <PaginaDemo orgSlug={orgSlug} titlu="Ținte șabloane · exemplu" descriere="De la țintele de exemplu la cele agreate cu echipa, rol cu rol. Un rol (Conducere) e deja confirmat în acest exemplu." latime={1100}>
      <SabloaneClient orgSlug={orgSlug} sabloane={d.sabloane} referinte={d.referinte} admin />
    </PaginaDemo>
  );
}
