import { Suspense } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";
import { rezolvaPerioada } from "@/lib/performanta-perioada";

import { obtinePaginaMeu } from "../activitati-actions";
import { PerfNav } from "../perf-nav";
import { SpatiulMeuClient } from "../spatiul-meu-client";

export const dynamic = "force-dynamic";

// Spațiul meu: ce am de făcut, ce mă blochează, ce trebuie actualizat și cum stau obiectivele mele. Gândit întâi pentru telefon.
export default async function SpatiulMeuPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const perioada = rezolvaPerioada(null);
  const date = await obtinePaginaMeu(orgSlug, perioada.start, perioada.end);
  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Spațiul meu</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">Doar ce ține de tine. Ce vezi aici nu e vizibil colegilor decât dacă ești implicat împreună cu ei.</p>
      </div>
      <Suspense fallback={null}>
        <PerfNav orgSlug={orgSlug} />
        <SpatiulMeuClient orgSlug={orgSlug} d={date} perioada={perioada.cod} />
      </Suspense>
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmPerformantaMeu");
}
