import { Suspense } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { DiscutiiClient } from "../discutii-client";
import { obtineDiscutii } from "../evaluari-actions";
import { PerfNav } from "../perf-nav";

export const dynamic = "force-dynamic";

const unu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Discuții și evaluări: actualizare săptămânală, 1:1, review trimestrial, autoevaluare, feedback și obiective de dezvoltare.
export default async function DiscutiiPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const sp = await searchParams;
  const ang = unu(sp.angajat);
  const date = await obtineDiscutii(orgSlug, UUID.test(ang) ? ang : null);
  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Discuții și evaluări</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">Conversațiile care țin munca pe drumul bun. Tonul e de sprijin: ce a mers, unde e nevoie de ajutor, ce urmează. Nu există scor unic pe persoană.</p>
      </div>
      <Suspense fallback={null}>
        <PerfNav orgSlug={orgSlug} />
        <DiscutiiClient orgSlug={orgSlug} d={date} />
      </Suspense>
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmPerformantaDiscutii");
}
