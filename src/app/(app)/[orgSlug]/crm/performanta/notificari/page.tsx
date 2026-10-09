import { Suspense } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { obtineNotificari } from "../automatizari-actions";
import { NotificariClient } from "../notificari-client";
import { PerfNav } from "../perf-nav";

export const dynamic = "force-dynamic";

// Notificările mele din Echipă & Performanță.
export default async function NotificariPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const d = await obtineNotificari(orgSlug);
  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Notificări</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">Doar ale tale. Aceeași informație nu ți se trimite de două ori.</p>
      </div>
      <Suspense fallback={null}>
        <PerfNav orgSlug={orgSlug} />
        <NotificariClient orgSlug={orgSlug} notificari={d.notificari} necitite={d.necitite} />
      </Suspense>
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmPerformantaNotificari");
}
