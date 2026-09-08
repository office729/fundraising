import Link from "next/link";

import { getLocale } from "@/lib/i18n/get-locale";
import { PORTOFOLIU_DICT } from "@/lib/i18n/dictionaries/portofoliu";

export default async function PortofoliuPage() {
  const locale = await getLocale();
  const dict = PORTOFOLIU_DICT[locale];

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

      <section className="bg-panel-2 px-[6%] py-14">
        <h2 className="font-display mx-auto max-w-2xl text-center text-xl font-bold text-ink">{dict.organizatiiTitlu}</h2>
        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dict.organizatii.map((o) => (
            <div key={o.nume} className="rounded-xl border border-line bg-panel p-5">
              <p className="font-display text-[15px] font-bold text-ink">{o.nume}</p>
              <p className="mt-1 text-[13px] text-brand-green">{o.rol}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-[6%] py-14">
        <div className="mx-auto max-w-2xl rounded-2xl border border-line bg-panel p-8">
          <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">{dict.studiuCazEyebrow}</span>
          <h3 className="font-display mt-2 text-xl font-bold text-ink">{dict.studiuCazTitlu}</h3>
          <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{dict.studiuCazDesc}</p>
          <a href="mailto:vlad.placinta@fundrasingacademy.ro" className="mt-4 inline-block font-bold text-brand-green">
            {dict.studiuCazCta}
          </a>
        </div>
      </section>

      <section className="bg-brand-blue px-[6%] py-14 text-center text-white">
        <p className="mx-auto max-w-xl text-lg font-medium">{dict.bandaTitlu}</p>
        <a
          href="mailto:vlad.placinta@fundrasingacademy.ro"
          className="mt-5 inline-block rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
        >
          {dict.bandaCta}
        </a>
      </section>
    </main>
  );
}
