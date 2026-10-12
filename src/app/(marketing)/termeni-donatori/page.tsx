import { getLocale } from "@/lib/i18n/get-locale";
import { TERMENI_DONATORI_DICT } from "@/lib/i18n/dictionaries/termeni-donatori";
import { metadatePagina } from "@/lib/page-titles";

import { LegalLayout, Sectiune } from "../legal-shared";

export default async function TermeniDonatoriPage() {
  const locale = await getLocale();
  const dict = TERMENI_DONATORI_DICT[locale];

  return (
    <LegalLayout locale={locale} homeLabel={dict.homeLabel} eyebrow={dict.eyebrow} titlu={dict.titlu} actualizatLabel={dict.actualizatLabel} actualizat={dict.actualizat}>
      {dict.sectiuni.map((s) => (
        <Sectiune key={s.titlu} titlu={s.titlu}>
          {s.paragrafe?.map((p) => <p key={p}>{p}</p>)}
        </Sectiune>
      ))}
    </LegalLayout>
  );
}

export async function generateMetadata() {
  return await metadatePagina("termeni-donatori");
}
