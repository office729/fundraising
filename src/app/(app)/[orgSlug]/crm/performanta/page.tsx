import { Suspense } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { PerfNav } from "./perf-nav";
import { PrezentareClient } from "./prezentare-client";
import { obtinePrezentare } from "./prezentare-actions";

export const dynamic = "force-dynamic";

const unu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Prezentare generală: cum stă organizația (sau o echipă) față de obiectivele perioadei, ce cere atenție și ce urmează.
export default async function PerformantaPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const sp = await searchParams;
  const dep = unu(sp.dep);
  const date = await obtinePrezentare(orgSlug, unu(sp.perioada) || null, UUID.test(dep) ? dep : null);
  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Echipă și performanță</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">De la obiectivele organizației la munca de zi cu zi, într-un singur loc. Nu clasifică oamenii: arată progresul, riscurile și ce are nevoie de sprijin.</p>
      </div>
      <Suspense fallback={null}>
        <PerfNav orgSlug={orgSlug} />
        <PrezentareClient orgSlug={orgSlug} d={date} />
      </Suspense>
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmPerformanta");
}
