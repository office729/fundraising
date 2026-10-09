import { dateDemo } from "@/lib/performanta-demo-date";

import { SaptamanaClient } from "../../saptamana-client";
import { PaginaDemo } from "../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoSaptamana({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  return (
    <PaginaDemo orgSlug={orgSlug} titlu="Planul săptămânii · exemplu" descriere="Activități cu termen, dependențe, aprobări și blocaje, ca listă, tablă sau calendar." latime={1500}>
      <SaptamanaClient orgSlug={orgSlug} d={d.saptamana} />
    </PaginaDemo>
  );
}
