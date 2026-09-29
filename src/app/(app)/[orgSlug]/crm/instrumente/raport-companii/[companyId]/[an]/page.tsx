import { obtineDetaliuRaportAction } from "../../raport-actions";
import { RaportDetaliuClient } from "../../raport-detaliu-client";

export default async function RaportDetaliuPage({
  params,
}: {
  params: Promise<{ orgSlug: string; companyId: string; an: string }>;
}) {
  const { orgSlug, companyId, an } = await params;
  const detaliu = await obtineDetaliuRaportAction(orgSlug, companyId, Number(an));

  return <RaportDetaliuClient orgSlug={orgSlug} companyId={companyId} an={Number(an)} detaliu={detaliu} />;
}
