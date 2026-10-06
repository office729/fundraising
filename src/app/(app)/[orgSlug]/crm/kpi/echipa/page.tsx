import { obtineEchipaManagerAction } from "../echipa-actions";
import { EchipaClient } from "../echipa-client";
import { titluAbsolut } from "@/lib/page-titles";

export default async function EchipaPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const echipa = await obtineEchipaManagerAction(orgSlug);

  return <EchipaClient orgSlug={orgSlug} echipa={echipa} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmKpiManager");
}
