import { withOrgSession } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { incarcaStatistici } from "./queries";
import { PERIOADE, StatisticiVedere } from "./vedere";

export const dynamic = "force-dynamic";

const getStatistici = withOrgSession(async (ctx, zile: number) => incarcaStatistici(ctx.db, ctx.orgId, ctx.orgSlug, zile));

export default async function StatisticiCampaniiPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ zile?: string }> }) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const zile = PERIOADE.find((p) => String(p.zile) === sp.zile)?.zile ?? 30;
  const d = await getStatistici(orgSlug, zile);
  return <StatisticiVedere orgSlug={orgSlug} zile={zile} d={d} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmStatisticiCampanii");
}
