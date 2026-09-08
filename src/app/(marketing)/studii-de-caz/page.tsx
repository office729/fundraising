import Link from "next/link";

import { getLocale } from "@/lib/i18n/get-locale";
import { STUDII_DE_CAZ_DICT } from "@/lib/i18n/dictionaries/studii-de-caz";

export default async function StudiiDeCazPage() {
  const locale = await getLocale();
  const dict = STUDII_DE_CAZ_DICT[locale];
  const { caz } = dict;

  return (
    <main>
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          {locale === "ro" ? "Acasă" : "Home"}
        </Link>{" "}
        › {dict.breadcrumb}
      </div>

      <section className="px-[6%] py-14 text-center">
        <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">{dict.eyebrow}</span>
        <h1 className="font-display mx-auto mt-2 max-w-2xl text-[32px] leading-tight font-bold text-ink">{dict.titlu}</h1>
      </section>

      <section className="px-[6%] pb-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-panel p-8 sm:p-10">
          <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">{caz.eyebrow}</span>
          <h2 className="font-display mt-2 text-2xl font-bold text-ink">{caz.titlu}</h2>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {caz.stats.map((s) => (
              <div key={s.l} className="rounded-lg bg-panel-2 p-3 text-center">
                <div className="font-display text-xl font-extrabold text-brand-blue">{s.v}</div>
                <div className="text-[11px] text-muted-2">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-6 text-[14.5px] leading-relaxed text-body">
            <div>
              <h3 className="font-display text-base font-bold text-ink">{caz.provocare.titlu}</h3>
              <p className="mt-1.5">{caz.provocare.desc}</p>
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">{caz.abordare.titlu}</h3>
              <p className="mt-1.5">{caz.abordare.desc}</p>
            </div>
            <div>
              <h3 className="font-display text-base font-bold text-ink">{caz.rezultat.titlu}</h3>
              <p className="mt-1.5">{caz.rezultat.desc}</p>
            </div>
          </div>

          <a
            href="mailto:vlad.placinta@fundrasingacademy.ro"
            className="mt-8 inline-block rounded-md bg-brand-green px-6 py-3 font-bold text-white transition hover:bg-brand-green-hover"
          >
            {caz.cta}
          </a>
        </div>

        <p className="mx-auto mt-8 max-w-3xl text-center text-[13.5px] text-muted-2">
          {dict.footnotePre}{" "}
          <Link href="/portofoliu" className="font-medium text-brand-green">
            {dict.footnoteCta}
          </Link>
        </p>
      </section>
    </main>
  );
}
