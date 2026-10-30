import { ArrowRight, Rss } from "lucide-react";
import Link from "next/link";

import { FirituriJsonLd } from "@/components/seo/firituri-json-ld";
import { INOVATII } from "@/content/inovatii";
import { NOUTATI_DICT } from "@/lib/i18n/dictionaries/noutati";
import { getLocale } from "@/lib/i18n/get-locale";
import { metadatePagina } from "@/lib/page-titles";

import { Reveal } from "../reveal";

const BUTON_PRIMAR = "inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover sm:w-auto";
const BUTON_SECUNDAR = "inline-flex w-full items-center justify-center rounded-md border border-line px-7 py-3.5 font-bold text-ink transition hover:border-brand-blue hover:text-brand-blue sm:w-auto";
const SIGNUP = "/signup?utm_source=site&utm_medium=pagina&utm_campaign=inovare&utm_content=noutati";

const dataLunga = (iso: string, locale: string) => new Intl.DateTimeFormat(locale === "ro" ? "ro-RO" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${iso}T12:00:00Z`));
// Calculele cu ora curentă stau în afara componentei (regula de puritate): „Nou” = ultimele 14 zile, contorul = ultimele 30.
const praguri = () => ({ nou: new Date(Date.now() - 14 * 86_400_000).toISOString().slice(0, 10), luna: new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10) });

// Arhiva publică „Noutăți”, citită din src/content/inovatii.ts (aceeași listă ca în platformă), cu feed RSS la /noutati/feed.xml.
export default async function NoutatiPage() {
  const locale = await getLocale();
  const dict = NOUTATI_DICT[locale];
  const { nou, luna } = praguri();
  const ultimaLuna = INOVATII.filter((n) => n.data >= luna).length;

  return (
    <main>
      <FirituriJsonLd pagina="noutati" cale="/noutati" />
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          {dict.acasa}
        </Link>{" "}
        › {dict.breadcrumb}
      </div>

      <section className="px-[6%] pt-10 pb-8">
        <div className="mx-auto max-w-3xl">
          <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">{dict.eyebrow}</span>
          <h1 className="font-display mt-2 text-[30px] leading-tight font-bold text-balance text-ink sm:text-[36px]">{dict.h1}</h1>
          <p className="mt-4 max-w-2xl text-[16px] leading-relaxed text-muted">{dict.subtitlu}</p>
          <p className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[14px] font-semibold text-ink">
            <span>{ultimaLuna > 0 ? dict.contor(ultimaLuna) : dict.contorZero}</span>
            <a href="/noutati/feed.xml" className="inline-flex items-center gap-1.5 text-brand-blue hover:underline">
              <Rss className="h-4 w-4" aria-hidden="true" /> {dict.rss}
            </a>
          </p>
        </div>
      </section>

      <section className="px-[6%] pb-14">
        <ol className="mx-auto flex max-w-3xl flex-col gap-4">
          {INOVATII.map((n, i) => (
            <li key={n.id} id={n.id} className="scroll-mt-24">
              <Reveal delay={(i % 4) * 60}>
                <article className="rounded-2xl border border-line bg-panel p-6">
                  <p className="flex flex-wrap items-center gap-2 text-[12.5px] text-muted">
                    {n.data >= nou && <span className="rounded-full bg-brand-green px-2 py-0.5 text-[11px] font-bold text-white">{dict.nou}</span>}
                    {n.dinPropunere && <span className="rounded-full bg-brand-blue-soft px-2 py-0.5 text-[11px] font-bold text-brand-blue">{dict.propusa}</span>}
                    <time dateTime={n.data}>{dataLunga(n.data, locale)}</time>
                    <span aria-hidden="true">·</span>
                    <span>{n.categorie}</span>
                  </p>
                  <h2 className="font-display mt-2 text-[19px] leading-snug font-bold text-ink">{n.titlu}</h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{n.descriere}</p>
                  {n.cumFolosesti && (
                    <p className="mt-3 rounded-lg bg-panel-2 px-3.5 py-2.5 text-[14px] leading-relaxed text-ink">
                      <strong>{dict.cumFolosesti}:</strong> {n.cumFolosesti}
                    </p>
                  )}
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-[6%] pb-16 sm:pb-20">
        <Reveal>
          <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-panel p-8 text-center">
            <h2 className="font-display text-[24px] leading-tight font-bold text-ink sm:text-[28px]">{dict.ctaTitlu}</h2>
            <p className="mx-auto mt-3 max-w-xl text-[15px] leading-relaxed text-muted">{dict.ctaDesc}</p>
            <div className="mt-6 flex flex-col justify-center gap-3.5 sm:flex-row">
              <Link href={SIGNUP} className={BUTON_PRIMAR}>
                {dict.ctaPrimar} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/cum-functioneaza/centrul-de-inovare" className={BUTON_SECUNDAR}>
                {dict.ctaSecundar}
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </main>
  );
}

export async function generateMetadata() {
  return await metadatePagina("noutati");
}
