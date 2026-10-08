import { requireOrgAccess } from "@/lib/auth/guard";

import { getSegmenteReale } from "./actions";
import { RfmClient } from "./rfm-client";

export const dynamic = "force-dynamic";

// Segmentele donatorilor persoane fizice, calculate din donatorii și abonamentele reale ale organizației.
export default async function RfmPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const segmente = await getSegmenteReale(orgSlug);
  return <RfmClient segmente={segmente} />;
}
