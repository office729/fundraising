import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { listeazaRapoartePf } from "../pf-actions";
import { PfNav } from "../pf-nav";

import { RapoarteClient } from "./rapoarte-client";

export const dynamic = "force-dynamic";

export default async function RapoartePfPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const rapoarte = await listeazaRapoartePf(orgSlug);
  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Rapoarte salvate</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">O combinație de segmente și filtre, cu un nume. Le redeschizi sau le exporți dintr-un click; contoarele se actualizează la fiecare deschidere.</p>
      </div>
      <PfNav orgSlug={orgSlug} />
      <RapoarteClient orgSlug={orgSlug} rapoarte={rapoarte} />
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmDonatoriRapoarte");
}
