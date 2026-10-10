import { requireOrgAccess } from "@/lib/auth/guard";

import { listeazaRaportCompaniiAction } from "./raport-actions";
import { RaportCompaniiClient } from "./raport-companii-client";

export default async function RaportCompaniiPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const anCurent = new Date().getFullYear();
  const initial = await listeazaRaportCompaniiAction(orgSlug, anCurent);

  const logo = access.orgLogoUrl && /^https:\/\//i.test(access.orgLogoUrl) ? access.orgLogoUrl : "";
  return (
    <RaportCompaniiClient
      orgSlug={orgSlug}
      initialAn={anCurent}
      initial={initial}
      galerie={{ organizatie: access.orgName, logoOng: logo, culoare: access.orgBrandColor, azi: new Date().toISOString().slice(0, 10) }}
    />
  );
}
