import { ArrowRight, Check, Layers, Lightbulb, Lock, MessageSquare, Rocket, ThumbsUp, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { FirituriJsonLd } from "@/components/seo/firituri-json-ld";
import { JsonLd } from "@/components/seo/json-ld";
import { INOVATII } from "@/content/inovatii";
import { CENTRUL_DE_INOVARE_DICT } from "@/lib/i18n/dictionaries/centrul-de-inovare";
import { getLocale } from "@/lib/i18n/get-locale";
import { metadatePagina } from "@/lib/page-titles";

import { Reveal } from "../../reveal";

const PICTOGRAME_PASI: LucideIcon[] = [Lightbulb, ThumbsUp, Rocket];
const PICTOGRAME_REGULI: LucideIcon[] = [Users, Lock, MessageSquare, Layers];

const BUTON_PRIMAR = "inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover sm:w-auto";
const BUTON_SECUNDAR_ALB = "inline-flex w-full items-center justify-center rounded-md border-[1.5px] border-white/40 px-7 py-3.5 font-bold text-white transition hover:border-white hover:bg-white/10 sm:w-auto";
const BUTON_SECUNDAR = "inline-flex w-full items-center justify-center rounded-md border border-line px-7 py-3.5 font-bold text-ink transition hover:border-brand-blue hover:text-brand-blue sm:w-auto";
const NR_NOUTATI = 6;
// Înscrierile de aici se văd în „Statistici și surse” ca venite din pagina Centrului de inovare.
const SIGNUP = "/signup?utm_source=site&utm_medium=pagina&utm_campaign=inovare&utm_content=centrul-de-inovare";

// „Nou” = publicat în ultimele 14 zile; contorul = ultimele 30. Calculele cu ora curentă stau în afara componentei (regula de puritate).
const praguri = () => ({ nou: new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10), luna: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10) });
const dataLunga = (iso: string, locale: string) => new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));

// Prezentarea publică a Centrului de inovare, sub „Cum funcționează”. „Ce am inovat” se citește din src/content/inovatii.ts, deci pagina se completează singură
// la fiecare lot publicat (aceeași listă ca în platformă). Dovada reală (ce am livrat) stă imediat sub antet; exemplele de idei sunt ilustrative și se scot când există idei reale.
export default async function CentrulDeInovarePage() {
  const locale = await getLocale();
  const dict = CENTRUL_DE_INOVARE_DICT[locale];
  const { nou, luna } = praguri();
  const noutati = INOVATII.slice(0, NR_NOUTATI);
  const ultimaLuna = INOVATII.filter((n) => n.data >= luna).length;

  return (
    <main>
      <FirituriJsonLd pagina="centrul-de-inovare" cale="/cum-functioneaza/centrul-de-inovare" />
      <JsonLd
        date={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: dict.faq.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
        }}
      />

      {/* Antet: mesajul și un exemplu din platformă */}
      <section className="fa-pe-albastru relative overflow-hidden bg-brand-blue px-[6%] py-16 text-white sm:py-20">
        <span className="fa-lumina pointer-events-none absolute -top-24 -left-24 hidden h-80 w-80 rounded-full bg-brand-green/40 blur-3xl sm:block" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div className="fa-aparitie">
            <p className="inline-block rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-bold tracking-[0.12em] text-white/90 uppercase">{dict.breadcrumb}</p>
            <h1 className="font-display mt-5 text-[30px] leading-[1.15] font-bold text-balance sm:text-[38px]">{dict.h1}</h1>
            <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-white/85">{dict.subtitlu}</p>
            <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:flex-wrap">
              <Link href={SIGNUP} className={BUTON_PRIMAR}>
                {dict.ctaPrimar} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/noutati" className={BUTON_SECUNDAR_ALB}>
                {dict.ctaSecundar}
              </Link>
            </div>
          </div>
          <div className="fa-aparitie lg:justify-self-end" style={{ animationDelay: "0.15s" }}>
            <div className="w-full max-w-md rounded-2xl bg-white p-5 text-ink shadow-xl">
              <p className="text-[13px] font-bold text-ink">{dict.exempluTitlu}</p>
              <ul className="mt-3 flex flex-col gap-2.5" aria-label={dict.exempluNota}>
                {dict.exemplu.map((e) => (
                  <li key={e.t} className="flex items-center gap-3 rounded-xl border border-line p-3">
                    <span className="flex w-12 shrink-0 flex-col items-center rounded-lg bg-brand-blue-soft py-1.5 text-brand-blue">
                      <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="text-[15px] leading-tight font-extrabold tabular-nums">{e.v}</span>
                      <span className="sr-only">{dict.voturi}</span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] leading-snug font-semibold text-ink">{e.t}</span>
                      <span className="mt-0.5 inline-block rounded-full bg-brand-green-soft px-2 py-0.5 text-[11px] font-bold text-brand-green">{e.s}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11.5px] text-muted">{dict.exempluNota}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Ce am inovat: singura dovadă reală, deci imediat sub antet. Aceeași listă ca în platformă, citită din cod. */}
      <section className="bg-panel-2 px-[6%] py-16">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-[28px] leading-tight font-bold text-balance text-ink sm:text-[32px]">{dict.noutatiTitlu}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{dict.noutatiSubtitlu}</p>
            {ultimaLuna > 0 && <p className="mt-3 text-[15px] font-bold text-brand-green">{dict.contor(ultimaLuna)}</p>}
          </div>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {noutati.map((n, i) => (
            <Reveal key={n.id} delay={(i % 3) * 80} className="h-full">
              <article className="flex h-full flex-col rounded-2xl border border-line bg-panel p-6">
                <p className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                  {n.data >= nou && <span className="rounded-full bg-brand-green px-2 py-0.5 text-[11px] font-bold text-white">{dict.noutateNou}</span>}
                  <time dateTime={n.data}>{dataLunga(n.data, locale)}</time>
                  <span aria-hidden="true">·</span>
                  <span>{n.categorie}</span>
                </p>
                <h3 className="font-display mt-2 text-[17px] leading-snug font-bold text-ink">{n.titlu}</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-muted">{n.descriere}</p>
                {n.cumFolosesti && (
                  <p className="mt-3 rounded-lg bg-panel-2 px-3 py-2 text-[13px] leading-relaxed text-ink">
                    <strong>{dict.cumFolosesti}:</strong> {n.cumFolosesti}
                  </p>
                )}
              </article>
            </Reveal>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/noutati" className={BUTON_SECUNDAR}>
            {dict.noutatiToate} <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>

      {/* Cei trei pași */}
      <section className="px-[6%] py-16">
        <Reveal>
          <h2 className="font-display mx-auto max-w-2xl text-center text-[28px] leading-tight font-bold text-balance text-ink sm:text-[32px]">{dict.pasiTitlu}</h2>
        </Reveal>
        <ol className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
          {dict.pasi.map((p, i) => {
            const Icon = PICTOGRAME_PASI[i] ?? Lightbulb;
            return (
              <li key={p.t}>
                <Reveal delay={i * 100} className="h-full">
                  <div className="h-full rounded-2xl border border-line bg-panel p-6">
                    <div className="flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green-soft text-brand-green">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <span className="font-display text-[34px] leading-none font-extrabold text-line" aria-hidden="true">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="font-display mt-4 text-[18px] font-bold text-ink">{p.t}</h3>
                    <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{p.d}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Drumul unei idei */}
      <section id="drumul-unei-idei" className="scroll-mt-20 bg-panel-2 px-[6%] py-16">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-[28px] leading-tight font-bold text-balance text-ink sm:text-[32px]">{dict.drumTitlu}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{dict.drumSubtitlu}</p>
          </div>
        </Reveal>
        <ol className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {dict.stari.map((s, i) => (
            <li key={s.t}>
              <Reveal delay={i * 80} className="h-full">
                <div className="h-full rounded-2xl border border-line bg-panel p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green text-[14px] font-bold text-white" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="font-display mt-3 text-[16px] font-bold text-ink">{s.t}</h3>
                  <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{s.d}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
        <p className="mx-auto mt-6 max-w-2xl text-center text-[13.5px] text-muted">{dict.drumNota}</p>
      </section>

      {/* Reguli */}
      <section className="px-[6%] py-16">
        <Reveal>
          <h2 className="font-display mx-auto max-w-2xl text-center text-[28px] leading-tight font-bold text-balance text-ink sm:text-[32px]">{dict.reguliTitlu}</h2>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2">
          {dict.reguli.map((r, i) => {
            const Icon = PICTOGRAME_REGULI[i] ?? Check;
            return (
              <Reveal key={r.t} delay={(i % 2) * 100} className="h-full">
                <div className="flex h-full gap-4 rounded-2xl border border-line bg-panel p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-[16px] font-bold text-ink">{r.t}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted">{r.d}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Întrebări frecvente (cu date structurate FAQPage) */}
      <section className="bg-panel-2 px-[6%] py-16">
        <Reveal>
          <h2 className="font-display mx-auto max-w-2xl text-center text-[28px] leading-tight font-bold text-balance text-ink sm:text-[32px]">{dict.faqTitlu}</h2>
        </Reveal>
        <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-3">
          {dict.faq.map((x) => (
            <details key={x.q} className="group rounded-2xl border border-line bg-panel p-5 open:shadow-sm">
              <summary className="cursor-pointer list-none text-[16px] font-bold text-ink marker:content-none">
                <span className="flex items-center justify-between gap-3">
                  {x.q}
                  <span className="text-brand-green transition group-open:rotate-45" aria-hidden="true">
                    +
                  </span>
                </span>
              </summary>
              <p className="mt-3 text-[14.5px] leading-relaxed text-muted">{x.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Inclus în toate pachetele */}
      <section className="px-[6%] py-16">
        <Reveal>
          <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-panel p-8 text-center">
            <h2 className="font-display text-[24px] leading-tight font-bold text-ink sm:text-[28px]">{dict.pachetTitlu}</h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">{dict.pachetDesc}</p>
            <ul className="mt-5 flex flex-wrap justify-center gap-2.5">
              {dict.pachete.map((p) => (
                <li key={p} className="inline-flex items-center gap-1.5 rounded-full bg-brand-green-soft px-4 py-1.5 text-[13.5px] font-bold text-brand-green">
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-col justify-center gap-3.5 sm:flex-row">
              <Link href="/hub" className={BUTON_SECUNDAR}>
                {dict.ctaPachete}
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Invitația finală */}
      <section className="px-[6%] pb-16 sm:pb-20">
        <Reveal>
          <div className="fa-pe-albastru relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-brand-blue px-6 py-12 text-center text-white sm:px-12 sm:py-14">
            <span className="fa-lumina pointer-events-none absolute -top-20 left-1/2 hidden h-64 w-64 -translate-x-1/2 rounded-full bg-brand-green/40 blur-3xl sm:block" aria-hidden="true" />
            <div className="relative">
              <h2 className="font-display mx-auto max-w-2xl text-[26px] leading-tight font-bold text-balance sm:text-[30px]">{dict.ctaTitlu}</h2>
              <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/85">{dict.ctaDesc}</p>
              <div className="mt-8 flex flex-col justify-center gap-3.5 sm:flex-row sm:flex-wrap">
                <Link href={SIGNUP} className={BUTON_PRIMAR}>
                  {dict.ctaPrimar} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/contact" className={BUTON_SECUNDAR_ALB}>
                  {dict.ctaContact}
                </Link>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}

export async function generateMetadata() {
  return await metadatePagina("centrul-de-inovare");
}
