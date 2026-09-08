import Link from "next/link";

import { getLocale } from "@/lib/i18n/get-locale";
import { BLOG_DICT } from "@/lib/i18n/dictionaries/blog";

export default async function BlogPage() {
  const locale = await getLocale();
  const dict = BLOG_DICT[locale];

  return (
    <main>
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          {locale === "ro" ? "Acasă" : "Home"}
        </Link>{" "}
        › {dict.breadcrumb}
      </div>

      <section className="px-[6%] py-20 text-center">
        <span className="text-xs font-extrabold tracking-wide text-brand-green uppercase">{dict.eyebrow}</span>
        <h1 className="font-display mx-auto mt-2 max-w-xl text-[28px] leading-tight font-bold text-ink">{dict.titlu}</h1>
        <p className="mx-auto mt-4 max-w-md text-[14.5px] leading-relaxed text-muted">{dict.desc}</p>
        <a
          href="mailto:vlad.placinta@fundrasingacademy.ro"
          className="mt-6 inline-block rounded-md bg-brand-green px-7 py-3.5 font-bold text-white transition hover:bg-brand-green-hover"
        >
          {dict.cta}
        </a>
      </section>
    </main>
  );
}
