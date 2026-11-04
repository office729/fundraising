import { INFLUENCERI_UI_DICT } from "@/lib/i18n/dictionaries/influenceri-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { parseazaFiltre } from "@/lib/influenceri/reguli";

import { obtineDate } from "./actions";
import { InfluenceriVedere } from "./vedere";

export const dynamic = "force-dynamic";
// Importul trimite loturi de până la 200 de rânduri (mai multe interogări pe rând): acțiunile rulează în această rută, deci îi dăm timp.
export const maxDuration = 120;

// Influenceri: lista (căutare și filtre) și fișa fiecăruia. Contactarea este manuală: platforma pregătește mesajul și linkul unic,
// colega îl trimite din contul organizației și apasă „Am trimis”. Pachetul IMPACT (poarta e în layout.tsx).
export default async function InfluenceriPage({ params, searchParams }: { params: Promise<{ orgSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { orgSlug } = await params;
  const filtre = parseazaFiltre(await searchParams);
  const date = await obtineDate(orgSlug, filtre);
  if (!date) {
    const d = INFLUENCERI_UI_DICT[await getLocale()];
    return (
      <div className="mx-auto max-w-[900px]">
        <h1 className="ci-display text-lg font-bold text-[var(--ci-text)]">{d.titlu}</h1>
        <p className="mt-2 text-[13px] text-[var(--ci-text-muted)]">{d.tabeleLipsa}</p>
      </div>
    );
  }
  return <InfluenceriVedere orgSlug={orgSlug} filtre={filtre} date={date} />;
}
