import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { dateDemo } from "@/lib/performanta-demo-date";

import { DiscutiiClient } from "../../discutii-client";
import { PaginaDemo } from "../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoDiscutii({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const ang = Array.isArray(sp.angajat) ? sp.angajat[0] : sp.angajat;
  const d = dateDemo();
  const p = PERFORMANTA_UI_DICT[await getLocale()].demo.discutii;
  return (
    <PaginaDemo orgSlug={orgSlug} titlu={p.titlu} descriere={p.descriere}>
      <DiscutiiClient orgSlug={orgSlug} d={d.discutii(ang ?? null)} />
    </PaginaDemo>
  );
}
