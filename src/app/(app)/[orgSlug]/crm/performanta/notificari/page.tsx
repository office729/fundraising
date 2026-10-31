import { Suspense } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { getLocale } from "@/lib/i18n/get-locale";
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
  const p = PERFORMANTA_UI_DICT[await getLocale()].pagini.notificari;
  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{p.titlu}</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">{p.descriere}</p>
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
