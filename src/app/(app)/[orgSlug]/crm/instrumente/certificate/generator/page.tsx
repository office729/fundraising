import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { infoOrganizatie } from "../../_comun/info-organizatie";
import { GeneratorCertificate } from "../certificate-client";

export const dynamic = "force-dynamic";

// „?model=…” vine din galerie: modelul ales e cel cu care pornește generatorul.
export default async function GeneratorPagina({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const access = await requireOrgAccess(orgSlug);
  return <GeneratorCertificate orgSlug={orgSlug} org={infoOrganizatie(access)} azi={new Date().toISOString().slice(0, 10)} model={typeof sp.model === "string" ? sp.model : undefined} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmCertificate");
}
