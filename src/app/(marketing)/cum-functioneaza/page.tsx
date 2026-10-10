import Link from "next/link";

import { CUM_FUNCTIONEAZA_DICT } from "@/lib/i18n/dictionaries/cum-functioneaza";
import { getLocale } from "@/lib/i18n/get-locale";
import { metadatePagina } from "@/lib/page-titles";

export default async function CumFunctioneazaPage() {
  const locale = await getLocale();
  const dict = CUM_FUNCTIONEAZA_DICT[locale];

  return (
    <main>
      <section className="bg-brand-blue px-[6%] py-16 text-center text-white sm:py-20">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold tracking-[0.14em] text-white/70 uppercase">{dict.breadcrumb}</p>
          <h1 className="font-display mt-3 text-[34px] leading-tight font-bold text-balance sm:text-[44px]">{dict.h1}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-white/80">{dict.subtitlu}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3.5">
            <Link href="/signup" className="rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover">
              {dict.ctaPrimar}
            </Link>
            <Link href="/hub" className="rounded-md border-[1.5px] border-[#2e639b] px-7 py-3.5 font-bold text-white transition hover:border-white">
              {dict.ctaSecundar}
            </Link>
          </div>
        </div>
      </section>

      {/* Pașii: ordinea e reală (cont → oameni → campanii → lucru), deci sunt numerotați */}
      <section className="px-[6%] py-16">
        <h2 className="font-display mx-auto max-w-2xl text-center text-[30px] leading-tight font-bold text-balance text-ink">{dict.pasiTitlu}</h2>
        <ol className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {dict.pasi.map((p, i) => (
            <li key={p.t} className="rounded-2xl border border-line bg-panel p-6">
              <span className="font-display flex h-9 w-9 items-center justify-center rounded-full bg-brand-solid text-[15px] font-bold text-white">{i + 1}</span>
              <h3 className="font-display mt-4 text-[17px] font-bold text-ink">{p.t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{p.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-panel-2 px-[6%] py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[30px] leading-tight font-bold text-balance text-ink">{dict.moduleTitlu}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{dict.moduleSubtitlu}</p>
        </div>
        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-2">
          {dict.module.map((m) => (
            <article key={m.t} className="rounded-2xl border border-line bg-panel p-6 sm:p-7">
              <h3 className="font-display text-[19px] font-bold text-ink">{m.t}</h3>
              <p className="mt-1.5 text-[14.5px] text-muted">{m.d}</p>
              <ul className="mt-4 flex flex-col gap-2.5 border-t border-line pt-4">
                {m.puncte.map((p) => (
                  <li key={p} className="flex gap-2.5 text-[14px] leading-relaxed text-body">
                    <span aria-hidden="true" className="flex-none font-extrabold text-brand-green">✓</span>
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="px-[6%] py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-[30px] leading-tight font-bold text-balance text-ink">{dict.exempluTitlu}</h2>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{dict.exempluSubtitlu}</p>
        </div>
        <ol className="mx-auto mt-10 max-w-2xl">
          {dict.exemplu.map((e, i) => (
            <li key={e.t} className="flex gap-4">
              <div className="flex flex-col items-center">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-brand-green bg-panel text-[14px] font-bold text-brand-green">{i + 1}</span>
                {i < dict.exemplu.length - 1 && <span aria-hidden="true" className="my-1 w-0.5 flex-1 bg-brand-green-soft" />}
              </div>
              <div className="pb-7">
                <h3 className="font-display text-[16px] font-bold text-ink">{e.t}</h3>
                <p className="mt-1 text-[14.5px] leading-relaxed text-muted">{e.d}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="bg-panel-2 px-[6%] py-16">
        <h2 className="font-display mx-auto max-w-2xl text-center text-[30px] leading-tight font-bold text-balance text-ink">{dict.datelorTitlu}</h2>
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2">
          {dict.datelor.map((d) => (
            <div key={d.t} className="rounded-2xl border border-line bg-panel p-6">
              <h3 className="font-display text-[16px] font-bold text-ink">{d.t}</h3>
              <p className="mt-2 text-[14px] leading-relaxed text-muted">{d.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-[6%] py-16 text-center">
        <h2 className="font-display mx-auto max-w-2xl text-[28px] leading-tight font-bold text-balance text-ink">{dict.ctaTitlu}</h2>
        <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-muted">{dict.ctaDesc}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3.5">
          <Link href="/signup" className="rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover">
            {dict.ctaPrimar}
          </Link>
          <Link href="/contact" className="rounded-md border border-line px-7 py-3.5 font-bold text-ink transition hover:border-brand-blue hover:text-brand-blue">
            {dict.ctaContact}
          </Link>
        </div>
      </section>
    </main>
  );
}

export async function generateMetadata() {
  return await metadatePagina("cum-functioneaza");
}
