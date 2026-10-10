import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { GalerieModele } from "./galerie-modele";

export const dynamic = "force-dynamic";

// Rapoarte de impact pentru companii: aici se alege doar șablonul. Datele firmei, logo-urile și exportul se fac în generator.
export default async function RaportCompaniiPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const logo = access.orgLogoUrl && /^https:\/\//i.test(access.orgLogoUrl) ? access.orgLogoUrl : "";
  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Rapoarte de impact pentru companii</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">Alegi un șablon. În generator încarci logo-urile, completezi proiectele și copiezi codul HTML sau exporți PDF.</p>
      </div>
      <GalerieModele orgSlug={orgSlug} organizatie={access.orgName} logoOng={logo} culoare={access.orgBrandColor} azi={new Date().toISOString().slice(0, 10)} />
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmRaportImpact");
}
