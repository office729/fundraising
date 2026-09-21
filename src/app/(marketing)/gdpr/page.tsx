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
      {dict.sectiuni.map((s) => (
        <Sectiune key={s.titlu} titlu={s.titlu}>
          {s.paragrafe?.map((p) => <p key={p}>{p}</p>)}
          {s.puncte && (
            <ul className="list-disc pl-5">
              {s.puncte.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          )}
          {s.incheiere?.map((p) => <p key={p}>{p}</p>)}
        </Sectiune>
      ))}
    </LegalLayout>
  );
}
