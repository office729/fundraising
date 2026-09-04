import Link from "next/link";
import { redirect } from "next/navigation";

import { getAuthUser, getMyOrgSlug } from "@/lib/auth/dal";
import { getLocale } from "@/lib/i18n/get-locale";
import { MARKETING_DICT } from "@/lib/i18n/dictionaries/marketing";

import { FinalizeForm } from "./finalize-form";

export default async function LandingPage() {
  // Un user logat cu organizație nu trebuie să mai vadă pagina de marketing
  // și să dea click pe „Continuă în platformă" — pagina principală, odată
  // logat, E dashboard-ul CRM direct.
  const authUser = await getAuthUser();
  const myOrgSlug = authUser ? await getMyOrgSlug() : null;
  if (myOrgSlug) {
    redirect(`/${myOrgSlug}/crm`);
  }
  // Autentificat (de obicei prin Google, primul login) dar fără organizație
  // încă — spre deosebire de fluxul clasic de /signup, contul Supabase deja
  // există aici, mai lipsește doar numele organizației.
  if (authUser?.email) {
    return <FinalizeForm email={authUser.email} />;
  }

  const locale = await getLocale();
  const dict = MARKETING_DICT[locale];

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-blue px-[6%] pt-12 pb-10 text-center text-white md:pt-14 md:pb-12">
        {/* Textură de fundal — pete de lumină + grilă fină de puncte, fără nicio imagine */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          <div className="absolute inset-0 opacity-[0.07] [background-image:radial-gradient(circle,white_1px,transparent_1px)] [background-size:26px_26px]" />
          <div className="absolute top-[-18%] right-[-10%] h-[420px] w-[420px] rounded-full bg-brand-green/25 blur-[110px]" />
          <div className="absolute bottom-[-25%] left-[-12%] h-[460px] w-[460px] rounded-full bg-[#3d6fb0]/40 blur-[120px]" />
        </div>

        <div className="relative mx-auto max-w-3xl">
          <span className="inline-block rounded-full border border-white/30 bg-white/10 px-3.5 py-1.5 text-xs font-bold tracking-wide text-white/90 uppercase">
            {dict.hero.eyebrow}
          </span>
          <h1 className="font-display mt-4 text-[28px] leading-[1.15] font-bold text-balance sm:text-[36px]">
            {dict.hero.titlePre}
            <span className="text-brand-green">{dict.hero.titleHighlight}</span>
            {dict.hero.titlePost}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">{dict.hero.subtitle}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3.5">
            <a
              href="mailto:vlad.placinta@fundrasingacademy.ro"
              className="rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
            >
              {dict.hero.ctaEnroll}
            </a>
            <Link
              href="/hub"
              className="rounded-md border-[1.5px] border-[#2e639b] px-7 py-3.5 font-bold text-white transition hover:border-white"
            >
              {dict.hero.ctaHub}
            </Link>
          </div>

          {/* Cifre de impact — scoase din text, ca element vizual propriu */}
          <div className="mt-6 grid grid-cols-3 divide-x divide-white/15 rounded-2xl border border-white/15 bg-white/[0.06] backdrop-blur-sm">
            {dict.hero.stats.map((s) => (
              <div key={s.l} className="px-3 py-2.5 sm:px-6">
                <p className="font-display text-lg font-extrabold text-white sm:text-2xl">{s.n}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-white/65 sm:text-xs">{s.l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tranziție curbă spre restul paginii */}
        <svg
          className="absolute right-0 bottom-[-1px] left-0 h-8 w-full text-canvas sm:h-12"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0,80 C360,10 1080,10 1440,80 L1440,80 L0,80 Z" fill="currentColor" />
        </svg>
      </section>

      {/* Hub callout */}
      <section className="px-[6%] py-14">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-5 rounded-2xl border-2 border-brand-green bg-brand-green-soft p-8 text-center sm:flex-row sm:text-left">
          <div className="flex-1">
            <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">{dict.hubCallout.badge}</span>
            <h2 className="font-display mt-1 text-xl font-bold text-ink">{dict.hubCallout.title}</h2>
            <p className="mt-2 text-[14.5px] leading-relaxed text-body">{dict.hubCallout.desc}</p>
          </div>
          <Link
            href="/hub"
            className="shrink-0 rounded-md bg-brand-green px-6 py-3 font-bold text-white transition hover:bg-brand-green-hover"
          >
            {dict.hubCallout.cta}
          </Link>
        </div>
      </section>

      {/* Ce vei învăța */}
      <section id="ce-vei-invata" className="px-[6%] py-16">
        <h2 className="font-display mx-auto max-w-2xl text-center text-[32px] font-bold text-ink">{dict.lectii.title}</h2>
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {dict.lectii.items.map((l) => (
            <div key={l.n} className="rounded-xl border border-line bg-panel p-6">
              <span className="font-display text-2xl font-extrabold text-brand-green/40">{l.n}</span>
              <h3 className="font-display mt-2 text-base font-bold text-ink">{l.t}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{l.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* De ce Fundraising Academy */}
      <section className="bg-panel-2 px-[6%] py-16">
        <h2 className="font-display mx-auto max-w-2xl text-center text-[32px] font-bold text-ink">{dict.valori.title}</h2>
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-3">
          {dict.valori.items.map((v) => (
            <div key={v.t} className="rounded-xl border border-line bg-panel p-6 text-center">
              <h3 className="font-display text-base font-bold text-ink">{v.t}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimoniale */}
      <section className="px-[6%] py-16">
        <h2 className="font-display mx-auto max-w-2xl text-center text-[32px] font-bold text-ink">{dict.testimoniale.title}</h2>
        <div className="mx-auto mt-10 grid max-w-5xl grid-cols-1 gap-5 sm:grid-cols-2">
          {dict.testimoniale.items.map((t) => (
            <div key={t.nume} className="rounded-2xl border border-line bg-panel-2 p-7">
              <p className="text-[15px] leading-relaxed text-body italic">&bdquo;{t.citat}&rdquo;</p>
              <p className="mt-4 font-extrabold text-ink">{t.nume}</p>
              <p className="text-sm text-muted-2">{t.rol}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
