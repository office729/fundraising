import { titluAbsolut } from "@/lib/page-titles";

import { obtineCalendarAction, obtineRitmAction } from "../ritm-actions";
import { RitmClient } from "../ritm-client";

export default async function RitmPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const [ritm, calendar] = await Promise.all([obtineRitmAction(orgSlug), obtineCalendarAction(orgSlug)]);
  return <RitmClient orgSlug={orgSlug} ritm={ritm} calendar={calendar} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmKpiRitm");
}
