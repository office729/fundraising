import { titluAbsolut } from "@/lib/page-titles";

import { D177Client } from "./d177-client";
import { listeazaFirmeD177 } from "./d177-actions";

export default async function D177Page({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const randuri = await listeazaFirmeD177(orgSlug);
  return <D177Client orgSlug={orgSlug} randuri={randuri} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmD177");
}