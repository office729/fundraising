import { requireOrgAccess } from "@/lib/auth/guard";
import { DONATORI_UI3_DICT } from "@/lib/i18n/dictionaries/donatori-ui-3";
import { getLocale } from "@/lib/i18n/get-locale";
import { titluAbsolut } from "@/lib/page-titles";

import { PfNav } from "../pf-nav";

import { listeazaImporturi } from "./actions";
import { ImporturiClient } from "./importuri-client";

export const dynamic = "force-dynamic";

export default async function ImporturiPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const acces = await requireOrgAccess(orgSlug);
  const importuri = await listeazaImporturi(orgSlug);
  const t = DONATORI_UI3_DICT[await getLocale()].importuri;
  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{t.titlu}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{t.subtitlu}</p>
      </div>
      <PfNav orgSlug={orgSlug} />
      <ImporturiClient orgSlug={orgSlug} importuri={importuri} poateImporta={acces.role === "owner" || acces.role === "admin"} />
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmDonatoriImporturi");
}
