import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { infoOrganizatie } from "../_comun/info-organizatie";
import { IstoricDocumente } from "../_comun/istoric-documente";
import { GalerieScrisori } from "./scrisori-client";

export const dynamic = "force-dynamic";

export default async function Pagina({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Scrisori cu antet</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">Alegi un șablon de scrisoare cu antet, completezi destinatarul și textul, apoi copiezi codul HTML sau exporți PDF.</p>
      </div>
      <IstoricDocumente orgSlug={orgSlug} tip="scrisori" hrefGenerator={`/${orgSlug}/crm/instrumente/scrisori/generator`} />
      <GalerieScrisori orgSlug={orgSlug} org={infoOrganizatie(access)} azi={new Date().toISOString().slice(0, 10)} />
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmScrisori");
}
