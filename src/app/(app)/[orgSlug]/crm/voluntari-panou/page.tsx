import { requireOrgAccess } from "@/lib/auth/guard";
import { titluAbsolut } from "@/lib/page-titles";

import { obtineDatePanou } from "./actions";
import { VoluntariPanouClient } from "./voluntari-panou-client";

export const dynamic = "force-dynamic";

// Panoul voluntarilor, partea echipei: linkul comun, campania săptămânii, setări pe campanie și activitatea voluntarilor.
export default async function VoluntariPanouPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  await requireOrgAccess(orgSlug);
  const date = await obtineDatePanou(orgSlug);
  return <VoluntariPanouClient orgSlug={orgSlug} date={date} />;
}

export async function generateMetadata() {
  return titluAbsolut("crmVoluntariPanou");
}
