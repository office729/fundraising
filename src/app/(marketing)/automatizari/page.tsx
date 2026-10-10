import { ArrowRight, Building2, Check, CreditCard, Globe, LayoutDashboard, PenLine, Settings2, Users, Workflow, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { getLocale } from "@/lib/i18n/get-locale";
import { AUTOMATIZARE_DICT } from "@/lib/i18n/dictionaries/automatizare";
import { metadatePagina } from "@/lib/page-titles";

import { FluxPasi } from "../flux-pasi";
import { Reveal } from "../reveal";

// Cele două acțiuni au destinații diferite: programarea unei întâlniri (secțiunea de consiliere) și pagina de contact.
const DEMO = "/hub#consultanta";
const CONTACT = "/contact";

// Pictogramele serviciilor, în ordinea din dicționar (Make.com, plăți, semnătură, platformă, website) și a grupurilor de exemple.
const PICTOGRAME_SERVICII: LucideIcon[] = [Workflow, CreditCard, PenLine, LayoutDashboard, Globe];
const PICTOGRAME_GRUPURI: LucideIcon[] = [Users, Building2, Settings2];
// Lățimea fiecărui serviciu pe grila de 6 coloane: patru carduri egale, apoi site-ul (cu lista lui de puncte) pe restul rândului.
const LATIME_SERVICIU = ["lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-4"];

const BUTON_PRIMAR = "inline-flex w-full items-center justify-center gap-2 rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover sm:w-auto";
const BUTON_SECUNDAR_ALB = "inline-flex w-full items-center justify-center rounded-md border-[1.5px] border-white/40 px-7 py-3.5 font-bold text-white transition hover:border-white hover:bg-white/10 sm:w-auto";
const BUTON_SECUNDAR = "inline-flex w-full items-center justify-center rounded-md border border-line px-7 py-3.5 font-bold text-ink transition hover:border-brand-blue hover:text-brand-blue sm:w-auto";

export default async function AutomatizarePage() {
  const locale = await getLocale();
  const dict = AUTOMATIZARE_DICT[locale];

  return (
    <main>
      {/* Antet: mesajul + un flux automat care se construiește pas cu pas */}
      <section className="fa-pe-albastru relative overflow-hidden bg-brand-blue px-[6%] py-16 text-white sm:py-20">
        <span className="fa-lumina pointer-events-none absolute -top-24 -right-24 hidden h-80 w-80 rounded-full bg-brand-green/40 blur-3xl sm:block" aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div className="fa-aparitie">
            <p className="inline-block rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-bold tracking-[0.12em] text-white/90 uppercase">{dict.eticheta}</p>
            <h1 className="font-display mt-5 text-[30px] leading-[1.15] font-bold text-balance sm:text-[38px]">{dict.h1}</h1>
            <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-white/85">{dict.subtitlu}</p>
            <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:flex-wrap">
              <Link href={DEMO} className={BUTON_PRIMAR}>
                {dict.ctaPrimary} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href={CONTACT} className={BUTON_SECUNDAR_ALB}>
                {dict.ctaSecondary}
              </Link>
            </div>
          </div>
          <div className="fa-aparitie lg:justify-self-end" style={{ animationDelay: "0.15s" }}>
            <FluxPasi titlu={dict.fluxTitlu} pasi={dict.flux} nota={dict.fluxNota} />
          </div>
        </div>
      </section>

      {/* Ce construim */}
      <section className="px-[6%] py-16">
        <Reveal>
          <h2 className="font-display mx-auto max-w-2xl text-center text-[28px] leading-tight font-bold text-balance text-ink sm:text-[32px]">{dict.serviciiTitlu}</h2>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {dict.servicii.map((s, i) => {
            const Icon = PICTOGRAME_SERVICII[i] ?? Workflow;
            const puncte = "puncte" in s ? s.puncte : null;
            return (
              <Reveal key={s.titlu} delay={(i % 3) * 90} className={`${LATIME_SERVICIU[i] ?? "lg:col-span-2"} ${puncte ? "sm:col-span-2" : ""}`}>
                <article className="h-full rounded-2xl border border-line bg-panel p-6 sm:p-7">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue">
                    <Icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                  <h3 className="font-display mt-4 text-[18px] font-bold text-ink">{s.titlu}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">{s.desc}</p>
                  {puncte && (
                    <ul className="mt-5 grid gap-x-8 gap-y-2.5 border-t border-line pt-5 sm:grid-cols-2">
                      {puncte.map((p) => (
                        <li key={p} className="flex gap-2.5 text-[13.5px] leading-relaxed text-body">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" aria-hidden="true" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Cum lucrăm: ordinea e reală, deci pașii sunt numerotați */}
      <section className="bg-panel-2 px-[6%] py-16">
        <Reveal>
          <h2 className="font-display mx-auto max-w-2xl text-center text-[28px] leading-tight font-bold text-balance text-ink sm:text-[32px]">{dict.lucramTitlu}</h2>
        </Reveal>
        <ol className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3">
          {dict.lucram.map((p, i) => (
            <li key={p.t}>
              <Reveal delay={i * 100} className="h-full">
                <div className="h-full rounded-2xl border border-line bg-panel p-6">
                  <span className="font-display flex h-9 w-9 items-center justify-center rounded-full bg-brand-solid text-[15px] font-bold text-white" aria-hidden="true">
                    {i + 1}
                  </span>
                  <h3 className="font-display mt-4 text-[17px] font-bold text-ink">{p.t}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-muted">{p.d}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* Exemple de automatizări */}
      <section className="px-[6%] py-16">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-[28px] leading-tight font-bold text-balance text-ink sm:text-[32px]">{dict.exempleTitlu}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{dict.exempleSubtitlu}</p>
          </div>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-5 lg:grid-cols-3">
          {dict.automatizariExemple.map((g, gi) => {
            const Icon = PICTOGRAME_GRUPURI[gi] ?? Settings2;
            return (
              <Reveal key={g.grup} delay={gi * 110} className="h-full">
                <div className="h-full rounded-2xl border border-line bg-panel p-6 sm:p-7">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-green-soft text-brand-green">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h3 className="font-display text-[16px] font-bold text-ink">{g.grup}</h3>
                  </div>
                  <ul className="mt-5 flex flex-col gap-3.5">
                    {g.items.map((item) => (
                      <li key={item} className="flex gap-2.5 text-[13.5px] leading-relaxed text-body">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" aria-hidden="true" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
        <Reveal>
          <p className="mx-auto mt-10 max-w-3xl text-center text-[15.5px] leading-relaxed text-body">{dict.bridgeText}</p>
          <div className="mt-6 flex flex-col justify-center gap-3.5 sm:flex-row">
            <Link href={DEMO} className={BUTON_PRIMAR}>
              {dict.ctaPrimary} <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href={CONTACT} className={BUTON_SECUNDAR}>
              {dict.ctaSecondary}
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Platforma */}
      <section className="bg-panel-2 px-[6%] py-16">
        <Reveal>
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-display text-[28px] leading-tight font-bold text-balance text-ink sm:text-[32px]">{dict.administreziTitlu}</h2>
            <p className="mt-4 text-[15px] leading-relaxed text-muted">{dict.administreziDesc}</p>
            <p className="mt-3 text-[15px] font-semibold text-ink">{dict.administreziIntro}</p>
          </div>
        </Reveal>
        <ul className="mx-auto mt-8 flex max-w-4xl flex-wrap justify-center gap-3">
          {dict.administrezi.map((a, i) => (
            <li key={a}>
              <Reveal delay={(i % 4) * 70}>
                <span className="inline-block rounded-full border border-line bg-panel px-4 py-2.5 text-[13.5px] font-medium text-ink">{a}</span>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* Invitația finală */}
      <section className="px-[6%] py-16 sm:pb-20">
        <Reveal>
          <div className="fa-pe-albastru relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-brand-blue px-6 py-12 text-center text-white sm:px-12 sm:py-14">
            <span className="fa-lumina pointer-events-none absolute -top-20 left-1/2 hidden h-64 w-64 -translate-x-1/2 rounded-full bg-brand-green/40 blur-3xl sm:block" aria-hidden="true" />
            <div className="relative">
              <h2 className="font-display mx-auto max-w-2xl text-[26px] leading-tight font-bold text-balance sm:text-[30px]">{dict.ctaTitlu}</h2>
              <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-white/85">{dict.ctaDesc}</p>
              <div className="mt-8 flex flex-col justify-center gap-3.5 sm:flex-row sm:flex-wrap">
                <Link href={DEMO} className={BUTON_PRIMAR}>
                  {dict.ctaPrimary} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href={CONTACT} className={BUTON_SECUNDAR_ALB}>
                  {dict.ctaSecondary}
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
  return await metadatePagina("automatizari");
}
