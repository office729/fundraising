import { DONATORI_UI3_DICT } from "@/lib/i18n/dictionaries/donatori-ui-3";
import { getLocale } from "@/lib/i18n/get-locale";
import { titluAbsolut } from "@/lib/page-titles";

import { PfNav } from "../pf-nav";

import { listeazaDubluri } from "./actions";
import { DubluriClient } from "./dubluri-client";

export const dynamic = "force-dynamic";

export default async function DubluriPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const date = await listeazaDubluri(orgSlug);
  const t = DONATORI_UI3_DICT[await getLocale()].dubluri;
  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{t.titlu}</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">
          {t.subtitlu}
        </p>
      </div>
      <PfNav orgSlug={orgSlug} />
      <DubluriClient orgSlug={orgSlug} date={date} />
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmDonatoriDubluri");
}
