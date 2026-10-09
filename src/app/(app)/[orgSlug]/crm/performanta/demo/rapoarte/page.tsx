import { dateDemo } from "@/lib/performanta-demo-date";

import { RapoarteClient } from "../../rapoarte-client";
import { PaginaDemo } from "../pagina-demo";

export const dynamic = "force-dynamic";

export default async function DemoRapoarte({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const d = dateDemo();
  return (
    <PaginaDemo orgSlug={orgSlug} titlu="Rapoarte · exemplu" descriere="Fiecare cifră își spune perioada, unitatea și sursa. Rapoartele arată progres și volum de muncă, nu un scor pe oameni.">
      <RapoarteClient orgSlug={orgSlug} d={d.rapoarte} departamente={d.departamente} />
    </PaginaDemo>
  );
}
