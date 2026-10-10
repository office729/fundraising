import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { pregatesteGenerator } from "../../_comun/pregatire-generator";
import { GeneratorScrisori } from "../scrisori-client";

export const dynamic = "force-dynamic";

// „?model=…” vine din galerie, „?firma=…” din fișa unei firme, „?doc=…” din istoric.
export default async function GeneratorPagina({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const access = await requireOrgAccess(orgSlug);
  const { org, semnatar, dateIni, firmaId, bannere } = await pregatesteGenerator(orgSlug, access, sp, "scrisori");
  return <GeneratorScrisori orgSlug={orgSlug} org={org} azi={new Date().toISOString().slice(0, 10)} model={typeof sp.model === "string" ? sp.model : undefined} semnatar={semnatar} dateIni={dateIni} firmaId={firmaId} bannere={bannere} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmScrisori");
}
