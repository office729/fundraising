import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { dateDemo } from "@/lib/performanta-demo-date";

import { ObiectiveClient } from "../../obiective-client";
import { PaginaDemo } from "../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoObiective({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  const p = PERFORMANTA_UI_DICT[await getLocale()].demo.obiective;
  return (
    <PaginaDemo orgSlug={orgSlug} titlu={p.titlu} descriere={p.descriere}>
      <ObiectiveClient orgSlug={orgSlug} sabloane={d.sabloane} obiective={d.obiective} optiuni={d.optiuni} perioada={{ start: d.trim.start, end: d.trim.end, cod: d.trim.cod }} azi={d.azi} />
    </PaginaDemo>
  );
}
