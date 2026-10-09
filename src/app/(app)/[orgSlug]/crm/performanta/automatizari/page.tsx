import { Suspense } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { AutomatizariClient } from "../automatizari-client";
import { obtineSetari } from "../automatizari-actions";
import { PerfNav } from "../perf-nav";

export const dynamic = "force-dynamic";

// Automatizări: ce notificări și ce sarcini apar singure, cine le primește și cum evităm repetările. Configurabil de un administrator.
export default async function AutomatizariPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const d = await obtineSetari(orgSlug);
  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Automatizări</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">Reguli clare, pornite sau oprite de organizație. Mai puține reamintiri de făcut manual, fără un val de alerte.</p>
      </div>
      <Suspense fallback={null}>
        <PerfNav orgSlug={orgSlug} />
        <AutomatizariClient orgSlug={orgSlug} setari={d.setari} angajati={d.angajati} admin={d.admin} />
      </Suspense>
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmPerformantaAutomatizari");
}
