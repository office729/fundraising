import { requireOrgAccess } from "@/lib/auth/guard";
import { INSTRUMENTE_UI_DICT } from "@/lib/i18n/dictionaries/instrumente-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { titluAbsolut } from "@/lib/page-titles";

import { infoOrganizatie } from "../_comun/info-organizatie";
import { IstoricDocumente } from "../_comun/istoric-documente";
import { MultumiriRestante } from "../_comun/multumiri-restante";
import { GalerieScrisori } from "./scrisori-client";

export const dynamic = "force-dynamic";

export default async function Pagina({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const t = INSTRUMENTE_UI_DICT[await getLocale()].scrisori;
  return (
    <div className="mx-auto max-w-[1200px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{t.titlu}</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">{t.subtitlu}</p>
      </div>
      <MultumiriRestante orgSlug={orgSlug} />
      <IstoricDocumente orgSlug={orgSlug} tip="scrisori" hrefGenerator={`/${orgSlug}/crm/instrumente/scrisori/generator`} />
      <GalerieScrisori orgSlug={orgSlug} org={infoOrganizatie(access)} azi={new Date().toISOString().slice(0, 10)} />
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmScrisori");
}
