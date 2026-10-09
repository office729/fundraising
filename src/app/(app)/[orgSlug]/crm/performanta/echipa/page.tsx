import { Suspense } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";
import { aziRo } from "@/lib/performanta-masurare";

import { obtineEchipa } from "../activitati-actions";
import { EchipaClient } from "../echipa-client";
import { PerfNav } from "../perf-nav";
import { obtineOrganizare } from "../prezentare-actions";

export const dynamic = "force-dynamic";

const unu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// Echipa: tabel, carduri, organigramă și capacitate pe săptămâni. Datele de muncă se văd doar în limitele drepturilor fiecăruia.
export default async function EchipaPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const sp = await searchParams;
  const luni = /^\d{4}-\d{2}-\d{2}$/.test(unu(sp.luni)) ? unu(sp.luni) : aziRo();
  const [date, departamente] = await Promise.all([obtineEchipa(orgSlug, luni), obtineOrganizare(orgSlug)]);
  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Echipa</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">Cine face parte din echipă, cine cui raportează și cât de încărcată e fiecare săptămână. Capacitatea ajută la planificare, nu la comparații între oameni.</p>
      </div>
      <Suspense fallback={null}>
        <PerfNav orgSlug={orgSlug} />
        <EchipaClient orgSlug={orgSlug} d={date} departamente={departamente} />
      </Suspense>
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmPerformantaEchipa");
}
