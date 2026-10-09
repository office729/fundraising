import Link from "next/link";
import { Suspense } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { obtineRaportEvaluari } from "../../evaluari-actions";
import { PerfNav } from "../../perf-nav";
import { RapoarteEvaluariClient } from "../../rapoarte-evaluari-client";

export const dynamic = "force-dynamic";

const unu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// Raportul de evaluări: acoperirea discuțiilor pe persoană (confidențial) și exportul auditat al conținutului.
export default async function RaportEvaluariPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const sp = await searchParams;
  const d = await obtineRaportEvaluari(orgSlug, unu(sp.perioada) || null);
  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div className="print:hidden">
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Raport de evaluări</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">
          Cine a avut ce discuții în perioadă. <Link href={`/${orgSlug}/crm/performanta/rapoarte`} className="font-medium text-[var(--ci-blue)] hover:underline">Înapoi la rapoartele generale</Link>
        </p>
      </div>
      <Suspense fallback={null}>
        <div className="print:hidden">
          <PerfNav orgSlug={orgSlug} />
        </div>
        <RapoarteEvaluariClient orgSlug={orgSlug} d={d.raport} admin={d.admin} manager={d.manager} />
      </Suspense>
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmPerformantaRapoarte");
}
