import { Suspense } from "react";
import type { ReactNode } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";

import { PerfNav } from "../perf-nav";

// Cadrul comun al paginilor din modul demonstrativ. Datele vin din memorie (lib/performanta-demo-date.ts), nu din baza de date a organizației;
// accesul e totuși doar pentru membrii organizației, ca restul aplicației.
export async function PaginaDemo({ orgSlug, titlu, descriere, latime = 1300, children }: { orgSlug: string; titlu: string; descriere: string; latime?: number; children: ReactNode }) {
  await requireOrgAccess(orgSlug);
  return (
    <div className="mx-auto space-y-5" style={{ maxWidth: latime }}>
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{titlu}</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">{descriere}</p>
      </div>
      <Suspense fallback={null}>
        <PerfNav orgSlug={orgSlug} />
        {children}
      </Suspense>
    </div>
  );
}
