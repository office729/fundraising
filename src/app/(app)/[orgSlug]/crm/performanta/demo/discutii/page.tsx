import { dateDemo } from "@/lib/performanta-demo-date";

import { DiscutiiClient } from "../../discutii-client";
import { PaginaDemo } from "../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoDiscutii({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const ang = Array.isArray(sp.angajat) ? sp.angajat[0] : sp.angajat;
  const d = dateDemo();
  return (
    <PaginaDemo orgSlug={orgSlug} titlu="Discuții și evaluări · exemplu" descriere="Actualizări săptămânale, 1:1, review trimestrial, autoevaluare, feedback și obiective de dezvoltare. Alege o persoană ca să vezi istoricul ei.">
      <DiscutiiClient orgSlug={orgSlug} d={d.discutii(ang ?? null)} />
    </PaginaDemo>
  );
}
