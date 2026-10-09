import { Suspense } from "react";

import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";
import { aziRo } from "@/lib/performanta-masurare";
import { rezolvaPerioada } from "@/lib/performanta-perioada";
import type { NivelObiectiv, StatusObiectiv } from "@/lib/performanta-tipuri";

import { PerfNav } from "../perf-nav";
import { obtineObiective } from "../obiective-actions";
import { ObiectiveClient } from "../obiective-client";

export const dynamic = "force-dynamic";

const unu = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Obiective și rezultate-cheie: lista, arborele de aliniere și cronologia. Perioada și filtrele sunt în adresă.
export default async function ObiectivePage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const sp = await searchParams;
  const perioada = rezolvaPerioada(unu(sp.perioada));
  const dep = unu(sp.dep);
  const resp = unu(sp.resp);
  const nivel = unu(sp.nivel);
  const status = unu(sp.status);
  const { obiective, optiuni } = await obtineObiective(orgSlug, {
    start: perioada.start,
    end: perioada.end,
    departmentId: UUID.test(dep) ? dep : null,
    responsabilId: UUID.test(resp) ? resp : null,
    nivel: ["strategic", "echipa", "individual"].includes(nivel) ? (nivel as NivelObiectiv) : null,
    status: ["activ", "finalizat", "anulat", "toate"].includes(status) ? (status as StatusObiectiv | "toate") : null,
    q: unu(sp.q).slice(0, 100),
  });
  return (
    <div className="mx-auto max-w-[1300px] space-y-5">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">Obiective și rezultate</h1>
        <p className="mt-0.5 max-w-3xl text-[13px] text-[var(--ci-text-muted)]">Ce vrem să obținem, cine răspunde și cum măsurăm. Starea compară progresul cu ritmul așteptat al perioadei; datele lipsă nu se socotesc ca zero.</p>
      </div>
      <Suspense fallback={null}>
        <PerfNav orgSlug={orgSlug} />
        <ObiectiveClient orgSlug={orgSlug} obiective={obiective} optiuni={optiuni} perioada={{ start: perioada.start, end: perioada.end, cod: perioada.cod }} azi={aziRo()} />
      </Suspense>
    </div>
  );
}

export async function generateMetadata() {
  return titluAbsolut("crmPerformantaObiective");
}
