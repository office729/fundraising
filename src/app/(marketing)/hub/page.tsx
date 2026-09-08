import Link from "next/link";

import { getLocale } from "@/lib/i18n/get-locale";
import { HUB_DICT } from "@/lib/i18n/dictionaries/hub";

type Plan = (typeof HUB_DICT)["ro"]["abonamente"][number];

function PricingCard({ plan, perLuna, popularBadge }: { plan: Plan; perLuna: string; popularBadge: string }) {
  return (
    <div
      className={`relative flex flex-col gap-3.5 rounded-2xl border bg-panel p-7 ${
        plan.popular ? "border-2 border-brand-green shadow-[0_12px_32px_rgba(63,168,92,0.16)]" : "border-line"
      }`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-green px-4 py-1 text-xs font-extrabold tracking-wide whitespace-nowrap text-white">
          {popularBadge}
        </div>
      )}
      <div className="text-[12.5px] font-extrabold tracking-wide text-brand-green uppercase">{plan.tag}</div>
      <h3 className="font-display text-[22px] font-bold text-ink">
        {plan.nume} — {plan.pret}
        {perLuna}
      </h3>
      <p className="text-[15px] leading-relaxed text-ink italic">&bdquo;{plan.citat}&rdquo;</p>
      <p className="text-[14.5px] leading-relaxed text-muted">{plan.desc}</p>
      <div className="flex flex-1 flex-col gap-2 border-t border-line pt-3.5">
        {plan.items.map((item) => (
          <div key={item} className="flex gap-2 text-[13.5px] leading-relaxed text-body">
            <span className="flex-none font-extrabold text-brand-green">✓</span>
            {item}
          </div>
        ))}
      </div>
      <Link
        href="/signup"
        className={`rounded-md py-3 text-center font-bold transition ${
          plan.popular
            ? "bg-brand-green text-white hover:bg-brand-green-hover"
            : "border border-brand-blue text-brand-blue hover:border-brand-blue-hover hover:text-brand-blue-hover"
        }`}
      >
        {plan.cta}
      </Link>
    </div>
  );
}

export default async function HubPage() {
  const locale = await getLocale();
  const dict = HUB_DICT[locale];

  return (
    <main>
      {/* Hero */}
      <section className="grid grid-cols-1 items-center gap-8 bg-brand-blue px-[6%] py-12 text-white md:grid-cols-[1.1fr_0.9fr] md:gap-12 md:py-14">
        <div>
          <span className="inline-block rounded-full border border-brand-green/50 bg-brand-green/20 px-3.5 py-1.5 text-xs font-bold tracking-wide text-[#9ce2af] uppercase">
            {dict.heroBadge}
          </span>
          <h1 className="font-display mt-4 text-[28px] leading-[1.15] font-bold text-balance sm:text-[34px]">{dict.heroTitlu}</h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-white/75">{dict.heroSubtitlu}</p>
          <div className="mt-6 flex flex-wrap gap-3.5">
            <a
              href="#abonamente"
              className="rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
            >
              {dict.heroCtaPrimary}
            </a>
            <Link
              href="/portofoliu-clienti"
              className="rounded-md border-[1.5px] border-[#2e639b] px-7 py-3.5 font-bold text-white transition hover:border-white"
            >
              {dict.heroCtaSecondary}
            </Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {dict.heroStats.map((s) => (
            <div key={s.l} className="rounded-[10px] border border-white/10 bg-white/5 p-4">
              <div className="font-display text-xl font-extrabold">{s.v}</div>
              <div className="mt-1 text-xs text-white/75">{s.l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Abonamente */}
      <section id="abonamente" className="px-[6%] py-[70px]">
        <div className="mx-auto mb-5 max-w-[760px] text-center">
          <h2 className="font-display text-[32px] font-bold text-ink">{dict.abonamenteTitlu}</h2>
          <p className="mt-3 text-base leading-relaxed text-muted">{dict.abonamenteDesc1}</p>
          <p className="mt-2 text-base leading-relaxed text-muted">{dict.abonamenteDesc2}</p>
        </div>

        <div className="mx-auto mb-11 grid max-w-[1200px] grid-cols-1 items-stretch gap-[22px] md:grid-cols-3">
          {dict.abonamente.map((plan) => (
            <PricingCard key={plan.nume} plan={plan} perLuna={dict.perLuna} popularBadge={dict.popularBadge} />
          ))}
        </div>

        <div className="mx-auto mb-5 max-w-[1200px] overflow-auto rounded-xl border border-line bg-panel">
          <div className="grid min-w-[700px] grid-cols-[1.6fr_1fr_1fr_1fr] bg-brand-blue">
            <div className="font-display p-4 text-[13.5px] font-bold text-white">{dict.comparatieTitlu}</div>
            <div className="font-display p-4 text-center text-[13.5px] font-bold text-white">START</div>
            <div className="font-display p-4 text-center text-[13.5px] font-bold text-white">CREȘTERE</div>
            <div className="font-display p-4 text-center text-[13.5px] font-bold text-white">IMPACT</div>
          </div>
          {dict.comparatie.map((row) => (
            <div key={row.f} className="grid min-w-[700px] grid-cols-[1.6fr_1fr_1fr_1fr] border-t border-line text-[13.5px]">
              <div className="p-3 px-4 font-semibold text-brand-blue">{row.f}</div>
              <div className="p-3 px-4 text-center text-body">{row.v0}</div>
              <div className="p-3 px-4 text-center text-body">{row.v1}</div>
              <div className="p-3 px-4 text-center text-body">{row.v2}</div>
            </div>
          ))}
        </div>

        <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-[22px] sm:grid-cols-2">
          <div className="rounded-xl border border-line p-[26px]">
            <h3 className="font-display mb-3 text-[17px] font-bold text-ink">{dict.anualeTitlu}</h3>
            <div className="flex flex-col gap-2 text-[14.5px] text-body">
              {dict.anuale.map((a) => (
                <div key={a.label}>
                  {a.label}: <strong>{a.pret}</strong>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-line p-[26px]">
            <h3 className="font-display mb-3 text-[17px] font-bold text-ink">{dict.optiuniTitlu}</h3>
            <div className="flex flex-col gap-2 text-[14.5px] text-body">
              {dict.optiuni.map((o) => (
                <div key={o.textBefore}>
                  {o.textBefore}: <strong>{o.pret}</strong>
                  {o.textAfter}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="mx-auto mt-14 max-w-[1200px]">
          <h3 className="font-display text-xl font-bold text-ink">{dict.internationalTitlu}</h3>
          <p className="mt-2 max-w-2xl text-[14.5px] leading-relaxed text-muted">{dict.internationalDesc}</p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {dict.comparatieInternationala.map((c) => (
              <div key={c.nume} className="rounded-xl border border-line bg-panel p-4">
                <p className="font-display text-sm font-bold text-ink">{c.nume}</p>
                <p className="mt-1 text-lg font-extrabold text-muted-2">{c.pretRon}</p>
                <p className="text-[12.5px] text-muted-2">
                  {c.pretUsd} · {c.nota}
                </p>
              </div>
            ))}
            <div className="rounded-xl border-2 border-brand-green bg-brand-green-soft p-4">
              <p className="font-display text-sm font-bold text-brand-green">{dict.faCardTitlu}</p>
              <p className="mt-1 text-lg font-extrabold text-ink">{dict.faCardPret}</p>
              <p className="text-[12.5px] text-ink/70">{dict.faCardDesc}</p>
            </div>
          </div>
          <p className="mt-4 text-[12px] leading-relaxed text-muted-2">{dict.internationalFootnote}</p>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-panel-2 px-[6%] py-16 text-center">
        <h2 className="font-display mb-3 text-[28px] font-bold text-ink">{dict.contactTitlu}</h2>
        <p className="mx-auto mb-[26px] max-w-[480px] text-base text-muted">{dict.contactDesc}</p>
        <div className="flex flex-wrap justify-center gap-3.5">
          <a
            href="mailto:vlad.placinta@fundrasingacademy.ro"
            className="rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
          >
            vlad.placinta@fundrasingacademy.ro
          </a>
          <a
            href="tel:0752753540"
            className="rounded-md border-[1.5px] border-line px-7 py-3.5 font-bold text-brand-blue transition hover:border-brand-blue"
          >
            0752 753 540
          </a>
        </div>
      </section>
    </main>
  );
}
