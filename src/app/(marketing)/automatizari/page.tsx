import { ArrowRight, Building2, Check, CreditCard, Globe, LayoutDashboard, PenLine, Settings2, Users, Workflow, type LucideIcon } from "lucide-react";

import { getLocale } from "@/lib/i18n/get-locale";
import { AUTOMATIZARE_DICT } from "@/lib/i18n/dictionaries/automatizare";
import { metadatePagina } from "@/lib/page-titles";

import { Reveal } from "../reveal";

const EMAIL = "mailto:vlad.placinta@alexandrit.ro";

// Pictogramele serviciilor, în ordinea din dicționar (Make.com, plăți, semnătură, platformă, website) și a grupurilor de exemple.
const PICTOGRAME_SERVICII: LucideIcon[] = [Workflow, CreditCard, PenLine, LayoutDashboard, Globe];
const PICTOGRAME_GRUPURI: LucideIcon[] = [Users, Building2, Settings2];
// Lățimea fiecărui serviciu pe grila de 6 coloane: trei carduri sus, apoi platforma și site-ul (cu lista lui de puncte).
const LATIME_SERVICIU = ["lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-2", "lg:col-span-4"];

export default async function AutomatizarePage() {
  const locale = await getLocale();
  const dict = AUTOMATIZARE_DICT[locale];

  return (
    <main>
      {/* Antet: mesajul + un flux automat animat */}
      <section className="relative overflow-hidden bg-brand-blue px-[6%] py-16 text-white sm:py-20">
        <span className="fa-lumina pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-brand-green/40 blur-3xl" aria-hidden="true" />
        <span className="fa-lumina pointer-events-none absolute -bottom-32 -left-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" style={{ animationDelay: "2.5s" }} aria-hidden="true" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div className="fa-aparitie">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1.5 text-[12px] font-bold tracking-[0.12em] text-white/85 uppercase">
              <Workflow className="h-3.5 w-3.5" aria-hidden="true" /> {dict.eticheta}
            </p>
            <h1 className="font-display mt-5 text-[30px] leading-[1.15] font-bold text-balance sm:text-[38px]">{dict.h1}</h1>
            <p className="mt-5 max-w-xl text-[16.5px] leading-relaxed text-white/80">{dict.subtitlu}</p>
            <div className="mt-8 flex flex-wrap gap-3.5">
              <a href={EMAIL} className="inline-flex items-center gap-2 rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover">
                {dict.ctaPrimary} <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
              <a href={EMAIL} className="rounded-md border-[1.5px] border-white/35 px-7 py-3.5 font-bold text-white transition hover:border-white">
                {dict.ctaSecondary}
              </a>
            </div>
          </div>

          <div className="fa-aparitie lg:justify-self-end" style={{ animationDelay: "0.15s" }}>
            <div className="fa-plutire w-full max-w-md rounded-3xl border border-white/15 bg-white/[0.07] p-6 shadow-2xl shadow-black/20 backdrop-blur sm:p-7">
              <p className="text-[12px] font-bold tracking-[0.12em] text-white/70 uppercase">{dict.fluxTitlu}</p>
              <div className="relative mt-6">
                {/* linia pe care aleargă punctul: de la centrul primului nod la centrul ultimului */}
                <span className="absolute top-[18px] left-[17px] h-[216px] w-px bg-white/25" aria-hidden="true">
                  <span className="fa-flux-punct absolute -left-[3px] h-[7px] w-[7px] rounded-full bg-white shadow-[0_0_10px_3px_rgba(255,255,255,0.55)]" />
                </span>
                <ol>
                  {dict.flux.map((p, i) => (
                    <li key={p.t} className="relative flex h-[72px] items-start gap-4">
                      <span
                        className="fa-flux-nod relative z-10 mt-0 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-white/40 text-[13px] font-bold"
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
                <article className="group h-full rounded-2xl border border-line bg-panel p-6 transition duration-300 hover:-translate-y-1 hover:border-brand-blue/40 hover:shadow-xl sm:p-7">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-blue-soft text-brand-blue transition duration-300 group-hover:scale-110 group-hover:bg-brand-solid group-hover:text-white">
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

      {/* Exemple de automatizări */}
      <section className="bg-panel-2 px-[6%] py-16">
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
              <Reveal key={g.grup} delay={gi * 110}>
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
        </Reveal>
      </section>

      {/* Platforma */}
      <section className="px-[6%] py-16">
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
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-4 py-2.5 text-[13.5px] font-medium text-ink shadow-sm transition duration-300 hover:-translate-y-0.5 hover:border-brand-green hover:shadow-md">
                  <Check className="h-4 w-4 text-brand-green" aria-hidden="true" />
                  {a}
                </span>
              </Reveal>
            </li>
          ))}
        </ul>
      </section>

      {/* Invitația finală */}
      <section className="px-[6%] pb-20">
        <Reveal>
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-brand-blue px-6 py-12 text-center text-white sm:px-12 sm:py-14">
            <span className="fa-lumina pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-brand-green/40 blur-3xl" aria-hidden="true" />
            <div className="relative">
              <h2 className="font-display mx-auto max-w-2xl text-[26px] leading-tight font-bold text-balance sm:text-[30px]">{dict.ctaTitlu}</h2>
              <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-white/80">{dict.ctaDesc}</p>
              <div className="mt-8 flex flex-wrap justify-center gap-3.5">
                <a href={EMAIL} className="inline-flex items-center gap-2 rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover">
                  {dict.ctaPrimary} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </a>
                <a href={EMAIL} className="rounded-md border-[1.5px] border-white/35 px-7 py-3.5 font-bold text-white transition hover:border-white">
                  {dict.ctaSecondary}
                </a>
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
