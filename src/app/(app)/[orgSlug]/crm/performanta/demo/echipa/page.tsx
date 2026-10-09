import { dateDemo } from "@/lib/performanta-demo-date";

import { EchipaClient } from "../../echipa-client";
import { PaginaDemo } from "../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoEchipa({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  return (
    <PaginaDemo orgSlug={orgSlug} titlu="Echipa · exemplu" descriere="Cine face parte din echipă, cine cui raportează și cât de încărcată e fiecare săptămână.">
      <EchipaClient orgSlug={orgSlug} d={{ membri: d.membri, luni: d.membri[0].saptamani.map((s) => s.luni), azi: d.azi, euAngajatId: d.optiuni.euAngajatId, admin: true }} departamente={d.departamente} />
    </PaginaDemo>
  );
}
