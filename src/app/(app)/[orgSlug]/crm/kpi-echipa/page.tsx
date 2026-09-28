import { requireOrgAccess } from "@/lib/auth/guard";

import { getKpiEchipa, getKpiPersonal } from "./actions";
import { KpiPersonalView } from "./kpi-personal";
import { KpiTabel } from "./kpi-tabel";
import { getObiective, getTendinta } from "./obiective-actions";
import { ObiectiveBoard } from "./obiective-board";
import { PerioadaPicker } from "./perioada-picker";
import { Tendinta } from "./tendinta";

export const dynamic = "force-dynamic";

// KPI de echipă: fiecare membru își vede propriul KPI („KPI-ul meu", cu contor +1 pentru
// emailuri/întâlniri); owner/admin văd în plus tabelul întregii echipei pe perioadă, cu ținte lunare editabile.
export default async function KpiEchipaPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ de?: string; la?: string }>;
}) {
  const { orgSlug } = await params;
  const { de, la } = await searchParams;
  const access = await requireOrgAccess(orgSlug);
  const esteAdmin = access.role === "owner" || access.role === "admin";

  const [personal, echipa, obiective, tendinta] = await Promise.all([
    getKpiPersonal(orgSlug),
    esteAdmin ? getKpiEchipa(orgSlug, { de, la }) : Promise.resolve(null),
    esteAdmin ? getObiective(orgSlug, { de }) : Promise.resolve(null),
    esteAdmin ? getTendinta(orgSlug) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div>
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">KPI echipă</h1>
        <p className="mt-0.5 text-[13px] text-[var(--ci-text-muted)]">
          Ce a lucrat fiecare în CRM, față de ținte. Realizatul se calculează automat din activitatea reală (nu trebuie completat nimic).
        </p>
      </div>

      <section>
        <h2 className="ci-display text-[15px] font-bold text-[var(--ci-text)]">
          KPI-ul meu <span className="text-[13px] font-normal text-[var(--ci-text-muted)]">({personal.nume})</span>
        </h2>
        <div className="mt-2">
          {!personal.areTinte && (
            <p className="mb-2 text-[12px] text-[var(--ci-text-muted)]">
              Nu ai încă ținte setate — se arată doar producția ta. {esteAdmin ? "Setează ținte mai jos, în tabelul echipei." : "Un administrator îți poate seta ținte lunare."}
            </p>
          )}
          <KpiPersonalView kpi={personal} />
        </div>
      </section>

      {echipa && obiective && tendinta && (
        <>
          <PerioadaPicker de={de ?? ""} la={la ?? ""} />
          <ObiectiveBoard obi={obiective} />
          <Tendinta date={tendinta} />
          <KpiTabel kpi={echipa} />
        </>
      )}
    </div>
  );
}
