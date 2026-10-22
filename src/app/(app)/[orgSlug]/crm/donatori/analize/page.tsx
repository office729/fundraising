import { requireOrgAccess } from "@/lib/auth/guard";
import { areModul } from "@/lib/billing/packages";
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
  const areAnaliza = areModul(pachetPentruModule(access.orgPackage, access.userEmail), "analiza-donator");
  const [date, reactivare] = await Promise.all([getAnalizePf(orgSlug), areAnaliza ? getReactivareDonatori(orgSlug) : Promise.resolve(null)]);
  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Analize donatori</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">Unde pierdem donatori, pe cine merită să-l recuperăm și ce segmente ascunse avem. Pragurile se pot ajusta; cele curente sunt explicate la fiecare secțiune.</p>
      </div>
      <PfNav orgSlug={orgSlug} />
      {reactivare ? (
        <ReactivarePrioritara orgSlug={orgSlug} date={reactivare} />
      ) : (
        <ModulBlocatInline
          orgSlug={orgSlug}
          modul="analiza-donator"
          descriere="Lista „Pe cine contactezi primul”: donatorii cu risc de pierdere, în ordinea în care merită contactați, cu ritm, dată estimată și valoare pe an."
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
