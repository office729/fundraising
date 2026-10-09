import { dateDemo } from "@/lib/performanta-demo-date";

import { ObiectiveClient } from "../../obiective-client";
import { PaginaDemo } from "../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoObiective({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  return (
    <PaginaDemo orgSlug={orgSlug} titlu="Obiective și rezultate · exemplu" descriere="Obiective strategice, pe echipă și individuale, aliniate între ele, cu rezultate-cheie măsurate după metoda fiecăruia.">
      <ObiectiveClient orgSlug={orgSlug} sabloane={d.sabloane} obiective={d.obiective} optiuni={d.optiuni} perioada={{ start: d.trim.start, end: d.trim.end, cod: d.trim.cod }} azi={d.azi} />
    </PaginaDemo>
  );
}
