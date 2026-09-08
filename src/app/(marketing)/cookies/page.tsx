import { getLocale } from "@/lib/i18n/get-locale";
import { COOKIES_DICT } from "@/lib/i18n/dictionaries/cookies";

import { LegalLayout, Sectiune } from "../legal-shared";

export default async function CookiesPage() {
  const locale = await getLocale();
  const dict = COOKIES_DICT[locale];

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
        <p>
          {dict.s2.introBefore} <strong>{dict.s2.introBold}</strong> {dict.s2.introAfter}
        </p>
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-[13px]">
            <thead className="bg-panel-2">
              <tr>
                <th className="p-2.5 font-semibold text-ink">{dict.s2.tabelHeaders.cookie}</th>
                <th className="p-2.5 font-semibold text-ink">{dict.s2.tabelHeaders.scop}</th>
                <th className="p-2.5 font-semibold text-ink">{dict.s2.tabelHeaders.durata}</th>
              </tr>
            </thead>
            <tbody>
              {dict.s2.randuri.map((c) => (
                <tr key={c.nume} className="border-t border-line">
                  <td className="p-2.5 font-mono text-[12px] text-brand-blue">{c.nume}</td>
                  <td className="p-2.5 text-body">{c.scop}</td>
                  <td className="p-2.5 text-muted-2">{c.durata}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Sectiune>

      <Sectiune titlu={dict.s3.titlu}>
        <p>
          {dict.s3.textBefore} <code>localStorage</code> {dict.s3.textAfter}
        </p>
      </Sectiune>

      <Sectiune titlu={dict.s4.titlu}>
        <p>
          {dict.s4.textBefore}{" "}
          <a href="https://policies.google.com/privacy" className="font-medium text-brand-green" target="_blank" rel="noreferrer">
            {dict.s4.linkText}
          </a>
          {dict.s4.textAfter}
        </p>
      </Sectiune>

      <Sectiune titlu={dict.s5.titlu}>
        <p>{dict.s5.text}</p>
      </Sectiune>
    </LegalLayout>
  );
}
