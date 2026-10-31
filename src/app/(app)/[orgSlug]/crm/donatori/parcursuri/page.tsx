import { DONATORI_UI4_DICT } from "@/lib/i18n/dictionaries/donatori-ui-4";
import { getLocale } from "@/lib/i18n/get-locale";

import { PfNav } from "../pf-nav";

import { citesteParcursuri } from "./actions";
import { ParcursuriClient } from "./parcursuri-client";

export const dynamic = "force-dynamic";

export default async function ParcursuriPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const date = await citesteParcursuri(orgSlug);
  const t = DONATORI_UI4_DICT[await getLocale()];
  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{t.titlu}</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">
          {t.subtitlu}
        </p>
      </div>
      <PfNav orgSlug={orgSlug} />
      <ParcursuriClient orgSlug={orgSlug} date={date} />
    </div>
  );
}
