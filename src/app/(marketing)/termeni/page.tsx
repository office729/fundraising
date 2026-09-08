import { getLocale } from "@/lib/i18n/get-locale";
import { TERMENI_DICT } from "@/lib/i18n/dictionaries/termeni";

import { LegalLayout, Sectiune } from "../legal-shared";

export default async function TermeniPage() {
  const locale = await getLocale();
  const dict = TERMENI_DICT[locale];

  return (
    <LegalLayout
      locale={locale}
      homeLabel={dict.homeLabel}
      eyebrow={dict.eyebrow}
      titlu={dict.titlu}
      actualizatLabel={dict.actualizatLabel}
      actualizat={dict.actualizat}
    >
      <Sectiune titlu={dict.s1.titlu}>
        <p>{dict.s1.text}</p>
      </Sectiune>

      <Sectiune titlu={dict.s2.titlu}>
        <p>{dict.s2.text}</p>
      </Sectiune>

      <Sectiune titlu={dict.s3.titlu}>
        <p>
          {dict.s3.text1Before} <code>/hub</code> {dict.s3.text1After}
        </p>
        <p>{dict.s3.text2}</p>
      </Sectiune>

      <Sectiune titlu={dict.s4.titlu}>
        <p>{dict.s4.text}</p>
      </Sectiune>

      <Sectiune titlu={dict.s5.titlu}>
        <p>{dict.s5.text}</p>
      </Sectiune>

      <Sectiune titlu={dict.s6.titlu}>
        <p>{dict.s6.text}</p>
      </Sectiune>

      <Sectiune titlu={dict.s7.titlu}>
        <p>
          {dict.s7.textBefore} <strong>vlad.placinta@fundrasingacademy.ro</strong>, 0752 753 540.
        </p>
      </Sectiune>
    </LegalLayout>
  );
}
