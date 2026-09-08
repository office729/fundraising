import Link from "next/link";

import { getLocale } from "@/lib/i18n/get-locale";
import { CINE_SUNTEM_DICT } from "@/lib/i18n/dictionaries/cine-suntem";

export default async function CineSuntemPage() {
  const locale = await getLocale();
  const dict = CINE_SUNTEM_DICT[locale];

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
        </div>
        <div className="mx-auto mt-8 flex max-w-3xl flex-col gap-4 text-[15px] leading-relaxed text-body">
          {dict.paragrafe.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      </section>

      <section className="bg-brand-blue px-[6%] py-14 text-white">
        <p className="mx-auto max-w-2xl text-center text-lg font-medium">{dict.statsTitlu}</p>
        <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-5 sm:grid-cols-4">
          {dict.stats.map((s) => (
            <div key={s.l} className="text-center">
              <div className="font-display text-3xl font-extrabold">{s.v}</div>
              <div className="mt-1 text-[13px] text-white/75">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-[6%] py-16">
        <h2 className="font-display mx-auto max-w-2xl text-center text-[28px] font-bold text-ink">{dict.diferentiatoriTitlu}</h2>
        <p className="mx-auto mt-2 max-w-2xl text-center text-[14.5px] text-muted">{dict.diferentiatoriSubtitlu}</p>
        <div className="mx-auto mt-8 flex max-w-2xl flex-col gap-3">
          {dict.diferentiatori.map((d) => (
            <div key={d} className="flex gap-3 rounded-xl border border-line bg-panel p-4 text-[14.5px] leading-relaxed text-body">
              <span className="font-extrabold text-brand-green">✓</span>
              {d}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-panel-2 px-[6%] py-16">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <h3 className="font-display text-base font-bold text-brand-green">{dict.misiune.titlu}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{dict.misiune.desc}</p>
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-brand-green">{dict.viziune.titlu}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{dict.viziune.desc}</p>
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-brand-green">{dict.valori.titlu}</h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{dict.valori.desc}</p>
          </div>
        </div>
      </section>

      <section className="px-[6%] py-14 text-center">
        <h2 className="font-display text-xl font-bold text-ink">{dict.exploreazaTitlu}</h2>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          {dict.exploreaza.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="rounded-md border border-line px-5 py-2.5 text-sm font-bold text-ink transition hover:border-brand-blue hover:text-brand-blue"
            >
              {e.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
