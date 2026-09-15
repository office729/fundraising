import type { DomeniuActivitate } from "@/lib/campaign-templates";
import type { DashboardHomeDict } from "@/lib/i18n/dictionaries/dashboard-home";

import type { Beneficiar, centruDeActiuni, companiiPipelineStats, dashboardKpis, lunarEvolutie } from "../../mock";

// Toate datele deja calculate de crm/page.tsx (KPI-uri, task-uri, pipeline,
// proiecte) — aceleași pentru orice familie de layout, doar învelișul vizual
// diferă per componentă. Un singur obiect, ca fiecare *-dashboard.tsx să nu
// repete o listă lungă de props identice.
export type DashboardData = {
  base: string;
  dict: DashboardHomeDict;
  domeniu: DomeniuActivitate | null;
  kpis: ReturnType<typeof dashboardKpis>;
  actiuni: ReturnType<typeof centruDeActiuni>;
  evolutie: ReturnType<typeof lunarEvolutie>;
  pipeline: ReturnType<typeof companiiPipelineStats>;
  inLucruPipeline: number;
  campaniiActive: Beneficiar[];
  blocate: number;
  apeluriReale: number | null;
  prioritateLabels: Record<"mare" | "medie" | "mica", string>;
};
