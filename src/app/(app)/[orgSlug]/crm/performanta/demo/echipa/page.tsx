import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { dateDemo } from "@/lib/performanta-demo-date";

import { EchipaClient } from "../../echipa-client";
import { PaginaDemo } from "../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoEchipa({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  const p = PERFORMANTA_UI_DICT[await getLocale()].demo.echipa;
  return (
    <PaginaDemo orgSlug={orgSlug} titlu={p.titlu} descriere={p.descriere}>
      <EchipaClient orgSlug={orgSlug} d={{ membri: d.membri, luni: d.membri[0].saptamani.map((s) => s.luni), azi: d.azi, euAngajatId: d.optiuni.euAngajatId, admin: true }} departamente={d.departamente} />
    </PaginaDemo>
  );
}
