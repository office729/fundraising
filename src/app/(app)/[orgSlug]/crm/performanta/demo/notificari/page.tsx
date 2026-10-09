import { dateDemo } from "@/lib/performanta-demo-date";

import { NotificariClient } from "../../notificari-client";
import { PaginaDemo } from "../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoNotificari({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  return (
    <PaginaDemo orgSlug={orgSlug} titlu="Notificări · exemplu" descriere="Doar ale tale. Aceeași informație nu ți se trimite de două ori." latime={900}>
      <NotificariClient orgSlug={orgSlug} notificari={d.notificari} necitite={d.notificari.filter((n) => !n.citit).length} />
    </PaginaDemo>
  );
}
