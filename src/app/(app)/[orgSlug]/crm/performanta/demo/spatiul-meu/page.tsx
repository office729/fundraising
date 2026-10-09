import { dateDemo } from "@/lib/performanta-demo-date";

import { SpatiulMeuClient } from "../../spatiul-meu-client";
import { PaginaDemo } from "../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoSpatiulMeu({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  return (
    <PaginaDemo orgSlug={orgSlug} titlu="Spațiul meu · exemplu" descriere="Ce are de făcut persoana, ce o blochează, ce trebuie actualizat și cum stau obiectivele ei. Gândit întâi pentru telefon.">
      <SpatiulMeuClient orgSlug={orgSlug} d={{ meu: d.spatiulMeu, context: d.context }} perioada={d.trim.cod} />
    </PaginaDemo>
  );
}
