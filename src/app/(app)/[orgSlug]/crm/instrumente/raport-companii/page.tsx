import { listeazaRaportCompaniiAction } from "./raport-actions";
import { RaportCompaniiClient } from "./raport-companii-client";

export default async function RaportCompaniiPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const anCurent = new Date().getFullYear();
  const initial = await listeazaRaportCompaniiAction(orgSlug, anCurent);

  return <RaportCompaniiClient orgSlug={orgSlug} initialAn={anCurent} initial={initial} />;
}
