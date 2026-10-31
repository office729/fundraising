import type { Metadata } from "next";

import { Rezervare } from "@/components/programari/rezervare";
import { PROGRAMARE_UI_DICT } from "@/lib/i18n/dictionaries/programare-ui";
import { getLocale } from "@/lib/i18n/get-locale";
import { paginaPublica } from "@/lib/programari/server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = PROGRAMARE_UI_DICT[await getLocale()].pagina;
  return { title: t.metaTitlu, description: t.metaDescriere };
}

// Calendarul intern de programări (înlocuiește Calendly): programul, tipurile de întâlniri și textele se setează din Panou platformă → Programări.
export default async function ProgramarePage() {
  const locale = await getLocale();
  const { setari, tipuri } = await paginaPublica().catch(() => ({ setari: null, tipuri: [] }));
  return (
    <main className="bg-panel-2 px-[6%] py-14 sm:py-20">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">{setari?.titlu ?? PROGRAMARE_UI_DICT[locale].pagina.titluImplicit}</h1>
        {setari?.intro && <p className="mt-3 max-w-2xl text-[16px] leading-relaxed text-muted">{setari.intro}</p>}
        <Rezervare tipuri={tipuri} cereTelefon={setari?.cereTelefon ?? false} sursa="programare" className="mt-8" locale={locale} />
      </div>
    </main>
  );
}
