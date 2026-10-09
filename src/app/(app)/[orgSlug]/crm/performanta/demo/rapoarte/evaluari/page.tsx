import { dateDemo } from "@/lib/performanta-demo-date";

import { RapoarteEvaluariClient } from "../../../rapoarte-evaluari-client";
import { PaginaDemo } from "../../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoRaportEvaluari({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  return (
    <PaginaDemo orgSlug={orgSlug} titlu="Raport de evaluări · exemplu" descriere="Cine a avut ce discuții în perioadă. Confidențial, cu export auditat în versiunea reală.">
      <RapoarteEvaluariClient orgSlug={orgSlug} d={d.raportEvaluari} admin manager />
    </PaginaDemo>
  );
}
