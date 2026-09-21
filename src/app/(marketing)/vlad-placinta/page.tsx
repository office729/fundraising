import Image from "next/image";
import Link from "next/link";

import { getLocale } from "@/lib/i18n/get-locale";
import { VLAD_PLACINTA_DICT } from "@/lib/i18n/dictionaries/vlad-placinta";

export default async function VladPlacintaPage() {
  const locale = await getLocale();
  const dict = VLAD_PLACINTA_DICT[locale];

  return (
    <main>
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          {dict.homeLabel}
        </Link>{" "}
        ›{" "}
        <Link href="/cine-suntem" className="hover:text-brand-blue">
          {dict.cineSuntem}
        </Link>{" "}
        › {dict.breadcrumb}
      </div>

      <section className="px-[6%] py-14">
        <div className="mx-auto grid max-w-5xl grid-cols-1 items-center gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <div className="mx-auto w-full max-w-[340px] overflow-hidden rounded-2xl border border-line bg-panel md:mx-0">
            <Image src="/vlad-placinta.webp" alt="Vlad Plăcintă" width={900} height={1037} priority sizes="(min-width: 768px) 340px, 90vw" className="h-auto w-full" />
          </div>
          <div>
            <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">{dict.eyebrow}</span>
            <h1 className="font-display mt-2 text-[34px] leading-tight font-bold text-ink">{dict.titlu}</h1>
            <p className="mt-2 text-[15px] text-muted">{dict.subtitlu}</p>
            <div className="mt-6 flex flex-col gap-4 text-[15px] leading-relaxed text-body">
              {dict.paragrafe.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-brand-blue px-[6%] py-12 text-white">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-5 sm:grid-cols-4">
          {dict.cifre.map((s) => (
            <div key={s.l} className="text-center">
              <div className="font-display text-3xl font-extrabold">{s.v}</div>
              <div className="mt-1 text-[13px] text-white/75">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-[6%] py-16">
        <h2 className="font-display mx-auto max-w-2xl text-center text-[26px] font-bold text-ink">{dict.lucruTitlu}</h2>
        <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
          {dict.lucru.map((l) => (
            <div key={l.titlu} className="rounded-xl border border-line bg-panel p-5">
              <h3 className="font-display text-[15px] font-bold text-ink">{l.titlu}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{l.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-panel-2 px-[6%] py-14 text-center">
        <h2 className="font-display text-xl font-bold text-ink">{dict.premiiTitlu}</h2>
        <p className="mx-auto mt-2 max-w-xl text-[14px] text-muted">{dict.premiiDesc}</p>
        <Link href="/premii" className="mt-4 inline-block text-sm font-bold text-brand-blue hover:underline">
          {dict.premiiCta}
        </Link>
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
