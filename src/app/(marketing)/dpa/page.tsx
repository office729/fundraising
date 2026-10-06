import { getLocale } from "@/lib/i18n/get-locale";
import { DPA_DICT } from "@/lib/i18n/dictionaries/dpa";

import { LegalLayout, Sectiune } from "../legal-shared";
import { metadatePagina } from "@/lib/page-titles";

export default async function DpaPage() {
  const locale = await getLocale();
  const dict = DPA_DICT[locale];

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

export async function generateMetadata() {
  return await metadatePagina("dpa");
}
