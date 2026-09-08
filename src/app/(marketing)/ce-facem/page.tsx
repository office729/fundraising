import Link from "next/link";

import { getLocale } from "@/lib/i18n/get-locale";
import { CE_FACEM_DICT } from "@/lib/i18n/dictionaries/ce-facem";

export default async function CeFacemPage() {
  const locale = await getLocale();
  const dict = CE_FACEM_DICT[locale];

  return (
    <main>
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          {locale === "ro" ? "Acasă" : "Home"}
        </Link>{" "}
        › {dict.breadcrumb}
      </div>

      <section className="px-[6%] py-14 text-center">
        <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">{dict.eyebrow}</span>
        <h1 className="font-display mx-auto mt-2 max-w-2xl text-[32px] leading-tight font-bold text-ink">{dict.titlu}</h1>
        <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-muted">{dict.subtitlu}</p>
      </section>

      <section className="px-[6%] pb-16">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-2">
          {dict.servicii.map((s) => (
            <div key={s.titlu} className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-7">
              <h2 className="font-display text-lg font-bold text-ink">{s.titlu}</h2>
              <p className="flex-1 text-[14px] leading-relaxed text-muted">{s.desc}</p>
              <Link href={s.ctaHref} className="font-bold text-brand-green">
                {s.ctaLabel} →
              </Link>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
