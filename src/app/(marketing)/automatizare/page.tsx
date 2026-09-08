import { getLocale } from "@/lib/i18n/get-locale";
import { AUTOMATIZARE_DICT } from "@/lib/i18n/dictionaries/automatizare";

export default async function AutomatizarePage() {
  const locale = await getLocale();
  const dict = AUTOMATIZARE_DICT[locale];

  return (
    <main>
      <section className="bg-brand-blue px-[6%] py-20 text-center text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-4xl leading-tight font-bold text-balance sm:text-[42px]">{dict.h1}</h1>
          <p className="mx-auto mt-[18px] max-w-2xl text-lg leading-relaxed text-white/75">{dict.subtitlu}</p>
        </div>
      </section>

      <section className="px-[6%] py-14">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {dict.servicii.map((s) => (
            <div key={s.titlu} className="rounded-xl border border-line bg-panel p-6">
              <h2 className="font-display text-base font-bold text-ink">{s.titlu}</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{s.desc}</p>
            </div>
          ))}
          {dict.automatizariExemple.map((g) => (
            <div key={g.grup} className="rounded-xl border border-line bg-panel p-6">
              <h3 className="font-display text-sm font-bold text-brand-green uppercase tracking-wide">{g.grup}</h3>
              <div className="mt-3 flex flex-col gap-2.5">
                {g.items.map((item) => (
                  <div key={item} className="flex gap-2 text-[13px] leading-relaxed text-body">
                    <span className="flex-none font-extrabold text-brand-green">✓</span>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-3xl text-center text-[15px] leading-relaxed text-body">{dict.bridgeText}</p>
      </section>

      <section className="bg-panel-2 px-[6%] py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-2xl font-bold text-ink">{dict.administreziTitlu}</h2>
          <p className="mt-4 text-[14.5px] leading-relaxed text-muted">{dict.administreziDesc}</p>
          <p className="mt-3 text-[14.5px] font-medium text-ink">{dict.administreziIntro}</p>
        </div>
        <div className="mx-auto mt-6 grid max-w-2xl grid-cols-1 gap-2.5 sm:grid-cols-2">
          {dict.administrezi.map((a) => (
            <div key={a} className="flex gap-2 text-[13.5px] text-body">
              <span className="font-extrabold text-brand-green">✓</span>
              {a}
            </div>
          ))}
        </div>
      </section>

      <section className="px-[6%] py-16 text-center">
        <h2 className="font-display mx-auto max-w-2xl text-2xl font-bold text-ink">{dict.ctaTitlu}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-[14.5px] leading-relaxed text-muted">{dict.ctaDesc}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3.5">
          <a
            href="mailto:vlad.placinta@fundrasingacademy.ro"
            className="rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
          >
            {dict.ctaPrimary}
          </a>
          <a
            href="mailto:vlad.placinta@fundrasingacademy.ro"
            className="rounded-md border border-line px-7 py-3.5 font-bold text-ink transition hover:border-brand-blue hover:text-brand-blue"
          >
            {dict.ctaSecondary}
          </a>
        </div>
      </section>
    </main>
  );
}
