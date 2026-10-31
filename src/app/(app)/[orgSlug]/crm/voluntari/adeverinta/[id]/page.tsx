import { notFound } from "next/navigation";

import { requireOrgAccess } from "@/lib/auth/guard";
import { VOLUNTARI_UI_DICT } from "@/lib/i18n/dictionaries/voluntari-ui";
import { getLocale } from "@/lib/i18n/get-locale";

import { AdeverintaClient } from "@/app/(app)/[orgSlug]/crm-voluntari/adeverinta/[id]/adeverinta-client";
import { obtineDateAdeverintaVoluntar } from "@/app/(app)/[orgSlug]/crm-voluntari/adeverinta/[id]/actions";

export const dynamic = "force-dynamic";
export async function generateMetadata() {
  return { title: VOLUNTARI_UI_DICT[await getLocale()].adeverintaMeta, robots: { index: false, follow: false } };
}

// Adeverința pornită din pagina „Voluntari”: orele sunt cele validate la activitățile pe teren.
export default async function AdeverintaVoluntarPage({ params }: { params: Promise<{ orgSlug: string; id: string }> }) {
  const { orgSlug, id } = await params;
  await requireOrgAccess(orgSlug);
  const date = await obtineDateAdeverintaVoluntar(orgSlug, decodeURIComponent(id));
  if (!date) notFound();
  return <AdeverintaClient orgSlug={orgSlug} date={date} inapoi={{ href: `/${orgSlug}/crm/voluntari`, eticheta: VOLUNTARI_UI_DICT[await getLocale()].adeverintaInapoi }} />;
}
