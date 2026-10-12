import Link from "next/link";
import { notFound } from "next/navigation";

import { organizatiePublica } from "@/lib/donator-portal";
import { getLocale } from "@/lib/i18n/get-locale";
import { PORTAL_DONATOR_DICT } from "@/lib/i18n/dictionaries/portal-donator";

import { CerereLink } from "./cerere-link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Donația lunară", robots: { index: false, follow: false } };

// Pagina publică unde un donator lunar își cere linkul de gestionare (suma, pauză, oprire, card). Fără cont: accesul vine prin email.
export default async function CerereLinkPage({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  const [org, locale] = await Promise.all([organizatiePublica(orgSlug), getLocale()]);
  if (!org) notFound();
  const t = PORTAL_DONATOR_DICT[locale].cere;
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-blue-soft/70 via-panel-2 to-panel-2">
      <main className="mx-auto max-w-xl px-4 py-10 sm:py-14">
        <Link href={`/strangere-fonduri/${orgSlug}`} className="text-[13px] font-semibold text-muted-2 transition hover:text-brand-blue">
          {t.inapoi(org.name)}
        </Link>
        <div className="mt-5 rounded-2xl border border-line bg-panel p-6 shadow-sm sm:p-8">
          <h1 className="font-display text-[26px] leading-tight font-bold text-ink">{t.titlu}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{t.intro}</p>
          <CerereLink orgSlug={orgSlug} locale={locale} />
        </div>
      </main>
    </div>
  );
}
