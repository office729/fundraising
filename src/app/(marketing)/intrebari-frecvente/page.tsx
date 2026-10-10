import Link from "next/link";

import { getLocale } from "@/lib/i18n/get-locale";
import { MARKETING_DICT } from "@/lib/i18n/dictionaries/marketing";
import { metadatePagina } from "@/lib/page-titles";

// Întrebările frecvente stau pe pagina lor, sub „Cine suntem” în meniu — <details>/<summary> nativ: accesibil din cutie
// (tastatură, cititoare de ecran), fără stare React necesară.
export default async function IntrebariFrecventePage() {
  const locale = await getLocale();
  const dict = MARKETING_DICT[locale];
  const faq = dict.intrebariFrecvente;

  return (
    <main>
      <div className="px-[6%] pt-8 text-sm text-muted-2">
        <Link href="/" className="hover:text-brand-blue">
          {locale === "ro" ? "Acasă" : "Home"}
        </Link>{" "}
        › <Link href="/cine-suntem" className="hover:text-brand-blue">{locale === "ro" ? "Cine suntem" : "Who we are"}</Link> › {faq.title}
      </div>

      <section className="px-[6%] py-12">
        <h1 className="font-display mx-auto max-w-2xl text-center text-[28px] leading-tight font-bold text-ink sm:text-[32px]">{faq.title}</h1>
        <div className="mx-auto mt-8 max-w-2xl divide-y divide-line rounded-2xl border border-line bg-panel">
          {faq.items.map((q) => (
            <details key={q.intrebare} className="group px-5 py-3.5 open:pb-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-[14.5px] leading-snug font-semibold text-ink marker:content-none">
                {q.intrebare}
                <span className="shrink-0 text-xl leading-none text-brand-blue transition-transform duration-200 group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2.5 text-[13.5px] leading-relaxed text-muted">{q.raspuns}</p>
            </details>
          ))}
        </div>
        <script
          type="application/ld+json"
          // JSON-LD generat din dicționarul propriu (text static, nu input extern) — necesar pentru rich results Google.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: faq.items.map((q) => ({
                "@type": "Question",
                name: q.intrebare,
                acceptedAnswer: { "@type": "Answer", text: q.raspuns },
              })),
            }),
          }}
        />
      </section>
    </main>
  );
}

export async function generateMetadata() {
  return await metadatePagina("intrebari-frecvente");
}
