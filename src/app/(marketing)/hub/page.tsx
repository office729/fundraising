import Image from "next/image";
import Link from "next/link";

import { CalendlyInlineWidget } from "@/components/calendly-inline-widget";
import { CALENDLY_CONSULTANTA_URL } from "@/lib/calendly";
import { getLocale } from "@/lib/i18n/get-locale";
import { HUB_DICT } from "@/lib/i18n/dictionaries/hub";

import { CustomPlanCalculator } from "./custom-plan-calculator";
import { PlansSection } from "./plans-section";
import { titluPagina } from "@/lib/page-titles";

// Calculatorul „Ai nevoie de altceva?" (plan personalizat) e ascuns momentan; pune true ca să reapară.
const AFISEAZA_PLAN_PERSONALIZAT = false;
// Tabelul de comparație a pachetelor e ascuns momentan; pune true ca să reapară.
const AFISEAZA_COMPARATIE = false;

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

        <PlansSection
          plans={dict.abonamente}
          locale={locale}
          texte={{
            facturareTitlu: dict.facturareTitlu,
            facturareLunar: dict.facturareLunar,
            facturareAnual: dict.facturareAnual,
            facturareReducere: dict.facturareReducere,
            perLuna: dict.perLuna,
            perAn: dict.perAn,
            pretFinalLabel: dict.pretFinalLabel,
            echivalentLunar: dict.echivalentLunar,
            facturatAnual: dict.facturatAnual,
            facturatLunar: dict.facturatLunar,
            popularBadge: dict.popularBadge,
          }}
        />

        {AFISEAZA_PLAN_PERSONALIZAT && <CustomPlanCalculator locale={locale} dict={dict} />}

        {AFISEAZA_COMPARATIE && (
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
        )}

        <div className="mx-auto max-w-[1200px]">
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

      {/* Consiliere 1 la 1 — destinația reală a butonului "Consiliere 1 la 1"
          din header (chrome.tsx) și a CTA-ului de pe /ce-facem, amândouă
          linkuind deja spre /hub#consultanta. */}
      <section id="consultanta" className="scroll-mt-20 px-[6%] py-[70px]">
        <div className="mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <span className="text-[12.5px] font-extrabold tracking-wide text-brand-green uppercase">
              {dict.consultantaEyebrow}
            </span>
            <h2 className="font-display mt-2 text-[28px] font-bold text-ink">{dict.consultantaTitlu}</h2>
            <p className="mt-3 max-w-md text-base leading-relaxed text-muted">{dict.consultantaDesc}</p>
            <figure className="mt-6 max-w-[360px] overflow-hidden rounded-2xl border border-line bg-panel">
              <Image
                src="/vlad-placinta.webp"
                alt="Vlad Plăcintă"
                width={900}
                height={1037}
                sizes="(min-width: 1024px) 360px, 90vw"
                className="h-auto w-full"
              />
              <figcaption className="px-4 py-3 text-[13.5px] text-muted">
                <span className="font-display font-bold text-ink">Vlad Plăcintă</span>
              </figcaption>
            </figure>
          </div>
          <CalendlyInlineWidget url={CALENDLY_CONSULTANTA_URL} loadingLabel={dict.consultantaLoading} />
        </div>
      </section>

      {/* Contact */}
      <section className="bg-panel-2 px-[6%] py-16 text-center">
        <h2 className="font-display mb-3 text-[28px] font-bold text-ink">{dict.contactTitlu}</h2>
        <p className="mx-auto mb-[26px] max-w-[480px] text-base text-muted">{dict.contactDesc}</p>
        <div className="flex flex-wrap justify-center gap-3.5">
          <a
            href="mailto:vlad.placinta@alexandrit.ro"
            className="rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
          >
            vlad.placinta@alexandrit.ro
          </a>
          <a
            href="tel:0757401042"
            className="rounded-md border-[1.5px] border-line px-7 py-3.5 font-bold text-brand-blue transition hover:border-brand-blue"
          >
            0757 401 042
          </a>
        </div>
      </section>
    </main>
  );
}

export async function generateMetadata() {
  return { title: await titluPagina("hub") };
}
