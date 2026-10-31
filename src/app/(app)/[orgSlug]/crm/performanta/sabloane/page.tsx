import { Suspense } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { titluAbsolut } from "@/lib/page-titles";

import { PerfNav } from "../perf-nav";
import { obtineSabloaneSiReferinte } from "../sabloane-actions";
import { SabloaneClient } from "../sabloane-client";

export const dynamic = "force-dynamic";

// Ținte șabloane: țintele reale ale organizației pentru șabloanele de roluri, cu valori de referință din CRM.
export default async function SabloanePage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const d = await obtineSabloaneSiReferinte(orgSlug);
  const p = PERFORMANTA_UI_DICT[await getLocale()].pagini.sabloane;
  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{p.titlu}</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">{p.descriere}</p>
      </div>
      <Suspense fallback={null}>
        <PerfNav orgSlug={orgSlug} />
        <SabloaneClient orgSlug={orgSlug} sabloane={d.sabloane} referinte={d.referinte} admin={d.admin} />
      </Suspense>
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmPerformantaSabloane");
}
