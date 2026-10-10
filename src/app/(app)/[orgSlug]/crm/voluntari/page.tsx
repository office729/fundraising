import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { obtineDateVoluntari } from "./actions";
import { VoluntariClient } from "./voluntari-client";

export const dynamic = "force-dynamic";

// Voluntari: voluntarii care ajută online (sarcini) și cei care vin la activități pe teren (ture, prezență, ore), într-un singur loc.
export default async function VoluntariPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const date = await obtineDateVoluntari(orgSlug);
  return <VoluntariClient orgSlug={orgSlug} date={date} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmVoluntari");
}
