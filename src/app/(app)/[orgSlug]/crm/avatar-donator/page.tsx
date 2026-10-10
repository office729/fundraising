import { requireOrgAccess } from "@/lib/auth/guard";

import { getAvatar } from "./actions";
import { AvatarDonatorClient } from "./avatar-donator-client";
import { titluAbsolut } from "@/lib/page-titles";

export const dynamic = "force-dynamic";

// Avatar donator: chestionarul „Avatarul donatorului perfect" + motor care transformă răspunsurile în
// alocare de buget pe platforme, platforma pe care să insiști și sfaturi de marketing.
export default async function AvatarDonatorPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const { data, stat, segmente, avatare } = await getAvatar(orgSlug);
  return <AvatarDonatorClient initial={data} stat={stat} segmente={segmente} avatare={avatare} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmAvatarDonator");
}
