import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { PfNav } from "../pf-nav";
import { getAnalizePf } from "../queries-analiza";

import { AnalizeClient } from "./analize-client";

export const dynamic = "force-dynamic";

// Analize peste aceeași bază de donatori: churn la newsletter, risc de abandon și win-back, radar (segmente ascunse), RFM și cohorte.
export default async function AnalizePfPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const date = await getAnalizePf(orgSlug);
  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Analize donatori</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">Unde pierdem donatori, pe cine merită să-l recuperăm și ce segmente ascunse avem. Pragurile se pot ajusta; cele curente sunt explicate la fiecare secțiune.</p>
      </div>
      <PfNav orgSlug={orgSlug} />
      <AnalizeClient orgSlug={orgSlug} date={date} />
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmDonatoriAnalize");
}
