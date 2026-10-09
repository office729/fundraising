import { dateDemo } from "@/lib/performanta-demo-date";

import { AutomatizariClient } from "../../automatizari-client";
import { PaginaDemo } from "../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoAutomatizari({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  return (
    <PaginaDemo orgSlug={orgSlug} titlu="Automatizări · exemplu" descriere="Reguli clare, pornite sau oprite de organizație. Mai puține reamintiri de făcut manual, fără un val de alerte.">
      <AutomatizariClient orgSlug={orgSlug} setari={d.setari} angajati={d.angajatiSetari} admin />
    </PaginaDemo>
  );
}
