import Link from "next/link";

import { getLocale } from "@/lib/i18n/get-locale";
import { PORTOFOLIU_CLIENTI_DICT } from "@/lib/i18n/dictionaries/portofoliu-clienti";

export default async function PortofoliuClientiPage() {
  const locale = await getLocale();
  const dict = PORTOFOLIU_CLIENTI_DICT[locale];

  return (
    <main>
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          {locale === "ro" ? "Acasă" : "Home"}
        </Link>{" "}
        ›{" "}
        <Link href="/hub" className="hover:text-brand-blue">
          {dict.breadcrumbHub}
        </Link>{" "}
        › {dict.breadcrumb}
      </div>

      <section className="px-[6%] py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">{dict.eyebrow}</span>
          <h1 className="font-display mt-2 text-[32px] leading-tight font-bold text-ink">{dict.titlu}</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">{dict.subtitlu}</p>
        </div>
      </section>

      <section className="px-[6%] pb-14">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {dict.clienti.map((c) => (
            <div key={c.nume} className="rounded-xl border border-line bg-panel p-6">
              <p className="font-display text-base font-bold text-ink">{c.nume}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {c.instrumente.map((i) => (
                  <span key={i} className="rounded-full bg-brand-blue-soft px-2.5 py-1 text-[11px] font-semibold text-brand-blue">
                    {i}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-muted">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-panel-2 px-[6%] py-14 text-center">
        <h2 className="font-display text-xl font-bold text-ink">{dict.bandaTitlu}</h2>
        <Link
          href="/hub"
          className="mt-5 inline-block rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
        >
          {dict.bandaCta}
        </Link>
      </section>
    </main>
  );
}
