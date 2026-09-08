import Link from "next/link";

import { getLocale } from "@/lib/i18n/get-locale";
import { PREMII_DICT } from "@/lib/i18n/dictionaries/premii";

export default async function PremiiPage() {
  const locale = await getLocale();
  const dict = PREMII_DICT[locale];

  return (
    <main>
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          {locale === "ro" ? "Acasă" : "Home"}
        </Link>{" "}
        ›{" "}
        <Link href="/cine-suntem" className="hover:text-brand-blue">
          {dict.breadcrumbCineSuntem}
        </Link>{" "}
        › {dict.breadcrumb}
      </div>

      <section className="px-[6%] py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">{dict.eyebrow}</span>
          <h1 className="font-display mt-2 text-[32px] leading-tight font-bold text-ink">{dict.titlu}</h1>
        </div>
        <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-4 text-[15px] leading-relaxed text-body">
          {dict.paragrafe.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </section>

      <section className="px-[6%] pb-14">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {dict.premii.map((p) => (
            <div key={p.titlu} className="flex gap-5 rounded-xl border border-line bg-panel p-5">
              <div className="w-28 shrink-0 text-[12.5px] font-medium text-muted-2">{p.data}</div>
              <div>
                {p.major && (
                  <span className="mb-1 inline-block rounded-full bg-brand-amber-soft px-2.5 py-0.5 text-[11px] font-bold text-brand-amber uppercase">
                    {dict.distinctieMajora}
                  </span>
                )}
                <h3 className="font-display text-[15px] font-bold text-ink">{p.titlu}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{p.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-brand-blue px-[6%] py-14 text-center text-white">
        <p className="mx-auto max-w-lg text-lg font-medium">{dict.bandaTitlu}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3.5">
          <a
            href="mailto:vlad.placinta@fundrasingacademy.ro"
            className="rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
          >
            {dict.bandaCta}
          </a>
          <Link
            href="/hub"
            className="rounded-md border-[1.5px] border-[#2e639b] px-7 py-3.5 font-bold text-white transition hover:border-white"
          >
            {dict.bandaCta2}
          </Link>
        </div>
      </section>
    </main>
  );
}
