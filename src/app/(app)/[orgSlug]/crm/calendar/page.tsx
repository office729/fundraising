import { requireOrgAccess } from "@/lib/auth/guard";
import { grilaLuna, lunaDinParametru } from "@/lib/calendar-fundraising";
import { getLocale } from "@/lib/i18n/get-locale";
import { aziBucuresti } from "@/lib/granturi/stari";

import { obtineEvenimente } from "./queries";
import { CalendarVedere } from "./vedere";

export const dynamic = "force-dynamic";

// Calendarul de fundraising: tot ce are o dată, într-o singură vedere (termene de granturi, sfârșituri de campanie, follow-up-uri,
// ture de voluntari, termene interne), plus momentele din an bune pentru o campanie.
export default async function CalendarPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<{ luna?: string }> }) {
  const { orgSlug } = await params;
  const sp = await searchParams;
  await requireOrgAccess(orgSlug);
  const azi = aziBucuresti();
  const { an, luna } = lunaDinParametru(sp.luna, azi);
  const grila = grilaLuna(an, luna, azi);
  const evenimente = await obtineEvenimente(orgSlug, grila.de, grila.pana);
  const locale = await getLocale();
  return <CalendarVedere orgSlug={orgSlug} an={an} luna={luna} azi={azi} evenimente={evenimente} locale={locale} />;
}
