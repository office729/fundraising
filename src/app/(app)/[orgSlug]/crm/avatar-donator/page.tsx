import { redirect } from "next/navigation";

import { requireOrgAccess } from "@/lib/auth/guard";
import { getLimiteleEfective } from "@/lib/billing/quota";
import { AVATAR_DONATOR_ACTIV } from "@/lib/module-ascunse";

import { getAvatar } from "./actions";
import { AvatarDonatorClient } from "./avatar-donator-client";
import { titluAbsolut } from "@/lib/page-titles";

export const dynamic = "force-dynamic";

// Avatar donator: chestionarul „Avatarul donatorului perfect" + motor care transformă răspunsurile în
// alocare de buget pe platforme, platforma pe care să insiști și sfaturi de marketing.
export default async function AvatarDonatorPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const access = await requireOrgAccess(orgSlug);
  if (!AVATAR_DONATOR_ACTIV) redirect(`/${orgSlug}/crm`);
  const avatarComplet = getLimiteleEfective(access.orgPackage, access.orgCustomPlanConfig).avatarComplet;
  const { data, stat, segmente, avatare } = await getAvatar(orgSlug);
  return <AvatarDonatorClient initial={data} stat={stat} segmente={segmente} avatare={avatare} avatarComplet={avatarComplet} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmAvatarDonator");
}
