import { withOrgSession } from "@/lib/auth/guard";
import { getLocale } from "@/lib/i18n/get-locale";
import { titluAbsolut } from "@/lib/page-titles";

import { incarcaStatistici } from "./queries";
import { PERIOADE, StatisticiVedere } from "./vedere";

export const dynamic = "force-dynamic";

const getStatistici = withOrgSession(async (ctx, zile: number, pageId?: string) => incarcaStatistici(ctx.db, ctx.orgId, ctx.orgSlug, zile, pageId));
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function StatisticiCampaniiPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ zile?: string; campanie?: string }> }) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  const zile = PERIOADE.find((p) => String(p.zile) === sp.zile)?.zile ?? 30;
  const campanie = sp.campanie && UUID.test(sp.campanie) ? sp.campanie : undefined;
  const d = await getStatistici(orgSlug, zile, campanie);
  const locale = await getLocale();
  return <StatisticiVedere orgSlug={orgSlug} locale={locale} zile={zile} d={d} campanieId={campanie && d.pagini.some((p) => p.id === campanie) ? campanie : null} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmStatisticiCampanii");
}
