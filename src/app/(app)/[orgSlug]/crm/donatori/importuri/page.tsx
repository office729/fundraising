import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { PfNav } from "../pf-nav";

import { listeazaImporturi } from "./actions";
import { ImporturiClient } from "./importuri-client";

export const dynamic = "force-dynamic";

export default async function ImporturiPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const acces = await requireOrgAccess(orgSlug);
  const importuri = await listeazaImporturi(orgSlug);
  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Importuri de donații</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">Încarcă un fișier cu donații (CSV sau Excel). Donatorii se agregă după email, donațiile deja existente nu se dublează, iar fiecare import poate fi șters.</p>
      </div>
      <PfNav orgSlug={orgSlug} />
      <ImporturiClient orgSlug={orgSlug} importuri={importuri} poateImporta={acces.role === "owner" || acces.role === "admin"} />
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmDonatoriImporturi");
}
