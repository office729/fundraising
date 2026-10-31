import { requireOrgAccess } from "@/lib/auth/guard";
import { areModul } from "@/lib/billing/packages";
import { DONATORI_UI_DICT } from "@/lib/i18n/dictionaries/donatori-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { pachetPentruModule } from "@/lib/billing/trial";
import { titluAbsolut } from "@/lib/page-titles";

import { ModulBlocatInline } from "../../components/modul-blocat-inline";
import { PfNav } from "../pf-nav";
import { getReactivareDonatori } from "../queries-risc";
import { ReactivarePrioritara } from "../reactivare-prioritara";
import { getAnalizePf } from "../queries-analiza";

import { AnalizeClient } from "./analize-client";

export const dynamic = "force-dynamic";

// Analize peste aceeași bază de donatori: churn la newsletter, risc de abandon și win-back, radar (segmente ascunse), RFM și cohorte.
export default async function AnalizePfPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  const locale = await getLocale();
  const t = DONATORI_UI_DICT[locale].analize;
  const areAnaliza = areModul(pachetPentruModule(access.orgPackage, access.userEmail), "analiza-donator");
  const [date, reactivare] = await Promise.all([getAnalizePf(orgSlug), areAnaliza ? getReactivareDonatori(orgSlug) : Promise.resolve(null)]);
  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{t.titlu}</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">{t.subtitlu}</p>
      </div>
      <PfNav orgSlug={orgSlug} />
      {reactivare ? (
        <ReactivarePrioritara orgSlug={orgSlug} date={reactivare} locale={locale} />
      ) : (
        <ModulBlocatInline
          orgSlug={orgSlug}
          modul="analiza-donator"
          descriere={t.modulBlocat}
          poateSchimba={access.role === "owner" || access.role === "admin"}
        />
      )}
      <AnalizeClient orgSlug={orgSlug} date={date} />
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmDonatoriAnalize");
}
