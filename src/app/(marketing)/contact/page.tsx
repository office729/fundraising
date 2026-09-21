import Link from "next/link";

import { getLocale } from "@/lib/i18n/get-locale";
import { CONTACT_DICT } from "@/lib/i18n/dictionaries/contact";

export default async function ContactPage() {
  const locale = await getLocale();
  const dict = CONTACT_DICT[locale];

  return (
    <main>
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          {dict.homeLabel}
        </Link>{" "}
        › {dict.breadcrumb}
      </div>

      <section className="px-[6%] py-14">
        <div className="mx-auto max-w-3xl text-center">
          <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">{dict.eyebrow}</span>
          <h1 className="font-display mt-2 text-[34px] leading-tight font-bold text-ink">{dict.titlu}</h1>
          <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">{dict.subtitlu}</p>
        </div>

        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
          {dict.persoane.map((p) => (
            <div key={p.email} className="rounded-2xl border border-line bg-panel p-7">
              <p className="text-[12.5px] font-extrabold tracking-wide text-brand-green uppercase">{p.rol}</p>
              <h2 className="font-display mt-1 text-[22px] font-bold text-ink">{p.nume}</h2>
              <dl className="mt-5 flex flex-col gap-3 text-[14.5px]">
                <div>
                  <dt className="text-[12px] font-bold tracking-wide text-muted-2 uppercase">{dict.emailLabel}</dt>
                  <dd>
                    <a href={`mailto:${p.email}`} className="font-medium text-brand-blue hover:underline">
                      {p.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-[12px] font-bold tracking-wide text-muted-2 uppercase">{dict.telefonLabel}</dt>
                  <dd>
                    <a href={`tel:${p.tel}`} className="font-medium text-brand-blue hover:underline">
                      {p.telefon}
                    </a>
                  </dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-brand-blue px-[6%] py-14 text-center text-white">
        <p className="mx-auto max-w-lg text-lg font-medium">{dict.bandaTitlu}</p>
        <div className="mt-5 flex justify-center">
          <Link href="/hub#consultanta" className="rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover">
            {dict.bandaCta}
          </Link>
        </div>
      </section>
    </main>
  );
}
