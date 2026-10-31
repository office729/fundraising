import { Suspense } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { PERFORMANTA_UI_DICT } from "@/lib/i18n/dictionaries/performanta-ui";
import { getLocale } from "@/lib/i18n/get-locale";
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
  const p = PERFORMANTA_UI_DICT[await getLocale()].pagini.automatizari;
  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{p.titlu}</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">{p.descriere}</p>
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
