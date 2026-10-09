import { Suspense } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { PerfNav } from "../perf-nav";
import { obtineOrganizare, obtineRapoarte } from "../prezentare-actions";
import { RapoarteClient } from "../rapoarte-client";

export const dynamic = "force-dynamic";

const unu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Rapoarte: obiective și rezultate-cheie, munca pe săptămâni și blocaje, cu export Excel și tipărire. Doar ce poate vedea utilizatorul.
export default async function RapoartePage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const sp = await searchParams;
  const dep = unu(sp.dep);
  const [d, departamente] = await Promise.all([obtineRapoarte(orgSlug, unu(sp.perioada) || null, UUID.test(dep) ? dep : null), obtineOrganizare(orgSlug)]);
  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div className="print:hidden">
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Rapoarte</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">Fiecare cifră își spune perioada, unitatea și sursa. Rapoartele arată progres și volum de muncă, nu un scor pe oameni.</p>
      </div>
      <Suspense fallback={null}>
        <div className="print:hidden">
          <PerfNav orgSlug={orgSlug} />
        </div>
        <RapoarteClient orgSlug={orgSlug} d={d} departamente={departamente} />
      </Suspense>
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmPerformantaRapoarte");
}
