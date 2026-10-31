import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { dateDemo } from "@/lib/performanta-demo-date";

import { RapoarteEvaluariClient } from "../../../rapoarte-evaluari-client";
import { PaginaDemo } from "../../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoRaportEvaluari({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  const p = PERFORMANTA_UI_DICT[await getLocale()].demo.rapoarteEvaluari;
  return (
    <PaginaDemo orgSlug={orgSlug} titlu={p.titlu} descriere={p.descriere}>
      <RapoarteEvaluariClient orgSlug={orgSlug} d={d.raportEvaluari} admin manager />
    </PaginaDemo>
  );
}
