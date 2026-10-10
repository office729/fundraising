import { ArrowRight, BarChart3, Building2, Check, CreditCard, FileText, HandHeart, KeyRound, Layers, Lock, Mail, Megaphone, Scale, UserPlus, Users, UsersRound, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { CUM_FUNCTIONEAZA_DICT } from "@/lib/i18n/dictionaries/cum-functioneaza";
import { getLocale } from "@/lib/i18n/get-locale";
import { metadatePagina } from "@/lib/page-titles";

import { Reveal } from "../reveal";

// Pictogramele, în ordinea din dicționar.
const PICTOGRAME_PASI: LucideIcon[] = [UserPlus, Users, Megaphone, BarChart3];
const PICTOGRAME_MODULE: LucideIcon[] = [Megaphone, Users, Building2, FileText, HandHeart, UsersRound, Mail, CreditCard];
const PICTOGRAME_DATE: LucideIcon[] = [Layers, KeyRound, Lock, Scale];

export default async function CumFunctioneazaPage() {
  const locale = await getLocale();
  const dict = CUM_FUNCTIONEAZA_DICT[locale];

  return (
    <main>
      {/* Antet: mesajul + cele patru etape, aprinse pe rând */}
      <section className="relative overflow-hidden bg-brand-blue px-[6%] py-16 text-white sm:py-20">
        <span className="fa-lumina pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-brand-green/40 blur-3xl" aria-hidden="true" />
        <span className="fa-lumina pointer-events-none absolute -right-20 -bottom-32 h-72 w-72 rounded-full bg-white/10 blur-3xl" style={{ animationDelay: "2.5s" }} aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div className="fa-aparitie">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-bold tracking-[0.12em] text-white/85 uppercase">{dict.breadcrumb}</p>
            <h1 className="font-display mt-5 text-[30px] leading-[1.15] font-bold text-balance sm:text-[38px]">{dict.h1}</h1>
            <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-white/80">{dict.subtitlu}</p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover">
                {dict.ctaPrimar} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link href="/hub" className="rounded-md border-[1.5px] border-white/35 px-7 py-3.5 font-bold text-white transition hover:border-white">
                {dict.ctaSecundar}
              </Link>
            </div>
          </div>

          <div className="fa-aparitie lg:justify-self-end" style={{ animationDelay: "0.15s" }}>
            <div className="fa-plutire w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.07] p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-7">
              <p className="text-[12px] font-bold tracking-[0.12em] text-white/70 uppercase">{dict.fluxTitlu}</p>
              <div className="relative mt-6">
                <span className="absolute top-[18px] left-[17px] h-[216px] w-px bg-white/25" aria-hidden="true">
                  <span className="fa-flux-punct absolute -left-[3px] h-[7px] w-[7px] rounded-full bg-white shadow-[0_0_10px_3px_rgba(255,255,255,0.55)]" />
                </span>
                <ol>
                  {dict.fluxPasi.map((p, i) => (
                    <li key={p.t} className="relative flex h-[72px] items-start gap-4">
                      <span
                        className="fa-flux-nod relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white/40"
                        style={{ animationDelay: `${i * 1.2}s` }}
                        aria-hidden="true"
                      >
                        <Check className="h-4 w-4" />
                      </span>
                      <span className="fa-flux-text pt-0.5" style={{ animationDelay: `${i * 1.2}s` }}>
                        <span className="font-display block text-[15.5px] font-bold">{p.t}</span>
                        <span className="block text-[13px] text-white/70">{p.d}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
              <p className="mt-2 border-t border-white/15 pt-4 text-[12px] text-white/60">{dict.fluxNota}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pașii: ordinea e reală (cont → oameni → campanii → lucru), deci sunt numerotați */}
      <section className="px-[6%] py-16">
        <Reveal>
          <h2 className="font-display mx-auto max-w-2xl text-center text-[28px] leading-tight font-bold text-balance text-ink sm:text-[32px]">{dict.pasiTitlu}</h2>
        </Reveal>
        <ol className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {dict.pasi.map((p, i) => {
            const Icon = PICTOGRAME_PASI[i] ?? UserPlus;
            return (
              <li key={p.t}>
                <Reveal delay={i * 100} className="h-full">
                  <div className="group relative h-full rounded-2xl border border-line bg-panel p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-blue/40 hover:shadow-xl">
                    <div className="flex items-center justify-between">
                      <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue transition duration-300 group-hover:scale-110 group-hover:bg-brand-solid group-hover:text-white">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <span className="font-display text-[34px] leading-none font-extrabold text-line transition duration-300 group-hover:text-brand-green/50" aria-hidden="true">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="font-display mt-4 text-[17px] font-bold text-ink">
                      <span className="sr-only">{i + 1}. </span>
                      {p.t}
                    </h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted">{p.d}</p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Modulele */}
      <section className="bg-panel-2 px-[6%] py-16">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-[28px] leading-tight font-bold text-balance text-ink sm:text-[32px]">{dict.moduleTitlu}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{dict.moduleSubtitlu}</p>
          </div>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-5 md:grid-cols-2">
          {dict.module.map((m, i) => {
            const Icon = PICTOGRAME_MODULE[i] ?? Layers;
            return (
              <Reveal key={m.t} delay={(i % 2) * 100} className="h-full">
                <article className="group h-full rounded-2xl border border-line bg-panel p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-blue/40 hover:shadow-xl sm:p-7">
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-green-soft text-brand-green transition duration-300 group-hover:scale-110 group-hover:bg-brand-green group-hover:text-white">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="font-display text-[19px] font-bold text-ink">{m.t}</h3>
                      <p className="mt-1 text-[14.5px] text-muted">{m.d}</p>
                    </div>
                  </div>
                  <ul className="mt-5 flex flex-col gap-2.5 border-t border-line pt-5">
                    {m.puncte.map((p) => (
                      <li key={p} className="flex gap-2.5 text-[14px] leading-relaxed text-body">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" aria-hidden="true" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Exemplul: de la campanie la donator care revine */}
      <section className="px-[6%] py-16">
        <Reveal>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-[28px] leading-tight font-bold text-balance text-ink sm:text-[32px]">{dict.exempluTitlu}</h2>
            <p className="mt-3 text-[15px] leading-relaxed text-muted">{dict.exempluSubtitlu}</p>
          </div>
        </Reveal>
        <ol className="mx-auto mt-10 max-w-2xl">
          {dict.exemplu.map((e, i) => (
            <li key={e.t}>
              <Reveal delay={60}>
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green text-[14px] font-bold text-white shadow-md shadow-brand-green/30">{i + 1}</span>
                    {i < dict.exemplu.length - 1 && <span aria-hidden="true" className="my-1 w-0.5 flex-1 bg-gradient-to-b from-brand-green to-brand-green/20" />}
                  </div>
                  <div className="mb-3 flex-1 rounded-2xl border border-line bg-panel p-5 transition duration-300 hover:border-brand-green/50 hover:shadow-md">
                    <h3 className="font-display text-[16px] font-bold text-ink">{e.t}</h3>
                    <p className="mt-1 text-[14.5px] leading-relaxed text-muted">{e.d}</p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* Datele */}
      <section className="bg-panel-2 px-[6%] py-16">
        <Reveal>
          <h2 className="font-display mx-auto max-w-2xl text-center text-[28px] leading-tight font-bold text-balance text-ink sm:text-[32px]">{dict.datelorTitlu}</h2>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2">
          {dict.datelor.map((d, i) => {
            const Icon = PICTOGRAME_DATE[i] ?? Lock;
            return (
              <Reveal key={d.t} delay={(i % 2) * 100} className="h-full">
                <div className="flex h-full gap-4 rounded-2xl border border-line bg-panel p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="font-display text-[16px] font-bold text-ink">{d.t}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-muted">{d.d}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* Invitația finală */}
      <section className="px-[6%] py-16 sm:pb-20">
        <Reveal>
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-brand-blue px-6 py-12 text-center text-white sm:px-12 sm:py-14">
            <span className="fa-lumina pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-green/40 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h2 className="font-display mx-auto max-w-2xl text-[26px] leading-tight font-bold text-balance sm:text-[30px]">{dict.ctaTitlu}</h2>
              <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/80">{dict.ctaDesc}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3.5">
                <Link href="/signup" className="inline-flex items-center gap-2 rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover">
                  {dict.ctaPrimar} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link href="/contact" className="rounded-md border-[1.5px] border-white/35 px-7 py-3.5 font-bold text-white transition hover:border-white">
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
  return await metadatePagina("cum-functioneaza");
}
