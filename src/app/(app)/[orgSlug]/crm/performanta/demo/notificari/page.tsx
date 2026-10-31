import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { dateDemo } from "@/lib/performanta-demo-date";

import { NotificariClient } from "../../notificari-client";
import { PaginaDemo } from "../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoNotificari({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  const p = PERFORMANTA_UI_DICT[await getLocale()].demo.notificari;
  return (
    <PaginaDemo orgSlug={orgSlug} titlu={p.titlu} descriere={p.descriere} latime={900}>
      <NotificariClient orgSlug={orgSlug} notificari={d.notificari} necitite={d.notificari.filter((n) => !n.citit).length} />
    </PaginaDemo>
  );
}
