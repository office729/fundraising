import { CalendarCheck, Mail, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { getLocale } from "@/lib/i18n/get-locale";
import { CONTACT_DICT } from "@/lib/i18n/dictionaries/contact";
import { titluPagina } from "@/lib/page-titles";

function initiale(nume: string) {
  return nume
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
}

export default async function ContactPage() {
  const locale = await getLocale();
  const dict = CONTACT_DICT[locale];

  return (
    <main>
      <section className="bg-brand-blue px-[6%] pt-14 pb-28 text-white">
        <div className="mx-auto max-w-3xl text-center">
          <div className="text-sm text-white/60">
            <Link href="/" className="hover:text-white">
              {dict.homeLabel}
            </Link>{" "}
            › {dict.breadcrumb}
          </div>
          <span className="mt-6 inline-block rounded-full border border-brand-green/50 bg-brand-green/20 px-3.5 py-1.5 text-xs font-bold tracking-wide text-[#9ce2af] uppercase">
            {dict.eyebrow}
          </span>
          <h1 className="font-display mt-4 text-[38px] leading-tight font-bold">{dict.titlu}</h1>
          <p className="mx-auto mt-3 max-w-xl text-[15.5px] leading-relaxed text-white/80">{dict.subtitlu}</p>
        </div>
      </section>

      <section className="-mt-16 px-[6%] pb-16">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
          {dict.persoane.map((p, i) => (
            <article key={p.email} className="flex flex-col rounded-2xl border border-line bg-panel p-7 shadow-[0_14px_36px_rgba(21,74,133,0.10)]">
              <div className="flex items-center gap-4">
                {i === 0 ? (
                  <Image src="/vlad-placinta.webp" alt={p.nume} width={72} height={72} className="h-[72px] w-[72px] rounded-full border-2 border-brand-green object-cover object-top" />
                ) : (
                  <span className="font-display flex h-[72px] w-[72px] items-center justify-center rounded-full bg-brand-blue text-xl font-bold text-white">
                    {initiale(p.nume)}
                  </span>
                )}
                <div>
                  <span className="rounded-full bg-brand-green-soft px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-brand-green uppercase">{p.rol}</span>
                  <h2 className="font-display mt-1.5 text-[21px] leading-tight font-bold text-ink">{p.nume}</h2>
                </div>
              </div>

              <ul className="mt-6 flex flex-col gap-3">
                <li>
                  <a href={`mailto:${p.email}`} className="group flex items-center gap-3 rounded-xl border border-line px-4 py-3 transition hover:border-brand-blue">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue/10 text-brand-blue">
                      <Mail className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[11.5px] font-bold tracking-wide text-muted-2 uppercase">{dict.emailLabel}</span>
                      <span className="block truncate text-[14.5px] font-semibold text-ink group-hover:text-brand-blue">{p.email}</span>
                    </span>
                  </a>
                </li>
                <li>
                  <a href={`tel:${p.tel}`} className="group flex items-center gap-3 rounded-xl border border-line px-4 py-3 transition hover:border-brand-blue">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green/15 text-brand-green">
                      <Phone className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-[11.5px] font-bold tracking-wide text-muted-2 uppercase">{dict.telefonLabel}</span>
                      <span className="block text-[14.5px] font-semibold text-ink group-hover:text-brand-blue">{p.telefon}</span>
                    </span>
                  </a>
                </li>
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-panel-2 px-[6%] py-14 text-center">
        <div className="mx-auto max-w-lg">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-green text-white">
            <CalendarCheck className="h-6 w-6" />
          </span>
          <p className="font-display mt-4 text-xl font-bold text-ink">{dict.bandaTitlu}</p>
          <Link href="/hub#consultanta" className="mt-5 inline-block rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover">
            {dict.bandaCta}
          </Link>
        </div>
      </section>
    </main>
  );
}

export async function generateMetadata() {
  return { title: await titluPagina("contact") };
}
