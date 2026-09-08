import { getLocale } from "@/lib/i18n/get-locale";
import { GDPR_DICT } from "@/lib/i18n/dictionaries/gdpr";

import { LegalLayout, Sectiune } from "../legal-shared";

export default async function GdprPage() {
  const locale = await getLocale();
  const dict = GDPR_DICT[locale];

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
        <p>{dict.s2.intro}</p>
        <ul className="list-disc pl-5">
          {dict.s2.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Sectiune>

      <Sectiune titlu={dict.s3.titlu}>
        <p>{dict.s3.text}</p>
      </Sectiune>

      <Sectiune titlu={dict.s4.titlu}>
        <p>{dict.s4.text}</p>
      </Sectiune>

      <Sectiune titlu={dict.s5.titlu}>
        <p>{dict.s5.text}</p>
      </Sectiune>

      <Sectiune titlu={dict.s6.titlu}>
        <p>{dict.s6.text1}</p>
        <p>
          {dict.s6.text2Before} <strong>vlad.placinta@fundrasingacademy.ro</strong>.
        </p>
      </Sectiune>

      <Sectiune titlu={dict.s7.titlu}>
        <p>{dict.s7.text}</p>
      </Sectiune>

      <Sectiune titlu={dict.s8.titlu}>
        <p>{dict.s8.text}</p>
      </Sectiune>
    </LegalLayout>
  );
}
