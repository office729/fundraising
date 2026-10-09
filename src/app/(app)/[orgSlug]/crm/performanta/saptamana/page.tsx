import { Suspense } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";
import { ETICHETE_PRIORITATE, ETICHETE_STATUS_ACT, type Prioritate, type StatusActivitate } from "@/lib/performanta-activitati-reguli";

import { obtineSaptamana } from "../activitati-actions";
import { PerfNav } from "../perf-nav";
import { SaptamanaClient } from "../saptamana-client";

export const dynamic = "force-dynamic";

const unu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Planul săptămânii: activitățile cu termen în săptămână (plus restanțele), ca listă, tablă sau calendar.
export default async function SaptamanaPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const sp = await searchParams;
  const resp = unu(sp.resp);
  const ob = unu(sp.ob);
  const prioritate = unu(sp.prioritate);
  const status = unu(sp.status);
  const date = await obtineSaptamana(orgSlug, unu(sp.luni) || null, {
    responsabilId: UUID.test(resp) ? resp : null,
    obiectivId: UUID.test(ob) ? ob : null,
    prioritate: prioritate in ETICHETE_PRIORITATE ? (prioritate as Prioritate) : null,
    status: status === "deschise" || status === "toate" ? status : status in ETICHETE_STATUS_ACT ? (status as StatusActivitate) : null,
    q: unu(sp.q).slice(0, 100),
  });
  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Planul săptămânii</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">Ce facem, cine se ocupă și până când. Activitățile spun ce se face; cât s-a obținut se vede la obiective, nu aici.</p>
      </div>
      <Suspense fallback={null}>
        <PerfNav orgSlug={orgSlug} />
        <SaptamanaClient orgSlug={orgSlug} d={date} />
      </Suspense>
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmPerformantaSaptamana");
}
