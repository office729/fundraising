import { and, desc, eq, sql } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { CAMPAIGN_TEMPLATES } from "@/lib/campaign-templates";
import { db } from "@/lib/db";
import { fundraisingDonations, fundraisingPages, fundraisingUpdates, organizations } from "@/lib/db/schema";
import { DONATION_DICT } from "@/lib/i18n/dictionaries/donation";
import { getLocale } from "@/lib/i18n/get-locale";

import { CampaignFooter } from "../campaign-footer";
import { DoneazaModal } from "./doneaza-modal";
import { ProgressRing } from "./progress-ring";
import { RecentDonationsList } from "./recent-donations-list";
import { ShareLinksClient } from "./share-links";

// Coloane public-safe pentru donații — NICIODATĂ email_donator aici, chiar
// dacă politica RLS ar permite (RLS controlează rânduri, nu coloane).
const COLOANE_DONATIE_PUBLICA = {
  id: fundraisingDonations.id,
  numeDonator: fundraisingDonations.numeDonator,
  suma: fundraisingDonations.suma,
  mesaj: fundraisingDonations.mesaj,
  anonim: fundraisingDonations.anonim,
  createdAt: fundraisingDonations.createdAt,
};

// cache() — memoizat per-request, ca generateMetadata și pagina propriu-zisă
// să nu interogheze DB de două ori pentru aceleași date.
const getPaginaPublica = cache(async (orgSlug: string, pageSlug: string) => {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.public_lookup', 'true', true)`);
    const org = await tx
      .select({
        id: organizations.id,
        name: organizations.name,
        logoUrl: organizations.logoUrl,
        slogan: organizations.slogan,
        cif: organizations.cif,
        donationStripePublishableKey: organizations.donationStripePublishableKey,
      })
      .from(organizations)
      .where(eq(organizations.slug, orgSlug))
      .limit(1);
    if (!org[0]) return null;

    const pagina = await tx
      .select()
      .from(fundraisingPages)
      .where(and(eq(fundraisingPages.orgId, org[0].id), eq(fundraisingPages.slug, pageSlug)))
      .limit(1);
    if (!pagina[0]) return null;

    const recente = await tx
      .select(COLOANE_DONATIE_PUBLICA)
      .from(fundraisingDonations)
      .where(and(eq(fundraisingDonations.pageId, pagina[0].id), eq(fundraisingDonations.status, "reusita")))
      .orderBy(desc(fundraisingDonations.createdAt))
      .limit(20);

    const topDonatori = await tx
      .select(COLOANE_DONATIE_PUBLICA)
      .from(fundraisingDonations)
      .where(and(eq(fundraisingDonations.pageId, pagina[0].id), eq(fundraisingDonations.status, "reusita")))
      .orderBy(desc(fundraisingDonations.suma))
      .limit(5);

    const actualizari = await tx
      .select()
      .from(fundraisingUpdates)
      .where(eq(fundraisingUpdates.pageId, pagina[0].id))
      .orderBy(desc(fundraisingUpdates.data));

    const [{ totalDonatii }] = await tx
      .select({ totalDonatii: sql<number>`count(*)::int` })
      .from(fundraisingDonations)
      .where(and(eq(fundraisingDonations.pageId, pagina[0].id), eq(fundraisingDonations.status, "reusita")));

    // Alte campanii active ale aceleiași organizații — link către
    // /strangere-fonduri/[orgSlug] (hub-ul organizației) pentru restul.
    const alteCampanii = await tx
      .select()
      .from(fundraisingPages)
      .where(
        and(
          eq(fundraisingPages.orgId, org[0].id),
          eq(fundraisingPages.status, "activa"),
          sql`${fundraisingPages.id} <> ${pagina[0].id}`,
        ),
      )
      .orderBy(desc(fundraisingPages.sumaStransa))
      .limit(3);

    return { org: org[0], pagina: pagina[0], recente, topDonatori, actualizari, totalDonatii, alteCampanii };
  });
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orgSlug: string; pageSlug: string }>;
}): Promise<Metadata> {
  const { orgSlug, pageSlug } = await params;
  const data = await getPaginaPublica(orgSlug, pageSlug);
  if (!data) return {};

  const { org, pagina } = data;
  const descriere = pagina.poveste.length > 160 ? `${pagina.poveste.slice(0, 157)}...` : pagina.poveste;

  return {
    title: `${pagina.titlu} — ${org.name}`,
    description: descriere,
    openGraph: { title: pagina.titlu, description: descriere, type: "website" },
    twitter: { card: "summary", title: pagina.titlu, description: descriere },
  };
}

export default async function PaginaStrangereFonduriPage({
  params,
}: {
  params: Promise<{ orgSlug: string; pageSlug: string }>;
}) {
  const { orgSlug, pageSlug } = await params;
  const [data, locale] = await Promise.all([getPaginaPublica(orgSlug, pageSlug), getLocale()]);
  if (!data) notFound();
  const t = DONATION_DICT[locale];

  const { org, pagina, recente, topDonatori, actualizari, totalDonatii, alteCampanii } = data;
  const procent = pagina.sumaTinta ? Math.min(100, Math.round((pagina.sumaStransa / pagina.sumaTinta) * 100)) : null;
  const tpl = CAMPAIGN_TEMPLATES[pagina.template];
  // Header "origin" nu e trimis pe navigare GET simplă (doar pe fetch/POST
  // cross-origin) — construim din host + protocolul reținut de proxy-ul Vercel.
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const url = `${proto}://${hdrs.get("host")}/strangere-fonduri/${orgSlug}/${pageSlug}`;

  // eslint-disable-next-line @next/next/no-img-element -- domeniu Supabase Storage dinamic
  const fotoCampanie = pagina.imagineUrl ? <img src={pagina.imagineUrl} alt={pagina.titlu} className="h-full w-full object-cover" /> : null;
  const heroFallback = <div className="h-full w-full bg-gradient-to-br from-brand-blue to-brand-green" />;
  const eyebrow = (
    <Link href={`/strangere-fonduri/${orgSlug}`} className="text-xs font-bold tracking-wide text-brand-green uppercase hover:underline">
      {t.campaignPage.verificataDe(org.name)}
    </Link>
  );
  const titlu = <h1 className="font-display mt-1.5 text-[30px] leading-tight font-bold text-ink">{pagina.titlu}</h1>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-blue-soft/70 via-panel-2 to-panel-2" data-domeniu={pagina.template}>
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <Link
          href={`/strangere-fonduri/${orgSlug}`}
          className="mb-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-2 transition hover:text-brand-blue"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> {t.campaignPage.acasaLa(org.name)}
        </Link>

        <div className="overflow-hidden rounded-[var(--radius-hero)] border border-line bg-panel shadow-[0_20px_50px_-25px_rgba(21,74,133,0.35)]">
          {tpl.familie === "natural-ancorat" ? (
            <div className="flex flex-col gap-5 p-6 pb-0 sm:flex-row sm:items-end sm:pb-0 sm:p-8">
              <div className="aspect-square w-full shrink-0 overflow-hidden rounded-[var(--radius-card)] sm:w-40">
                {fotoCampanie ?? heroFallback}
              </div>
              <div className="min-w-0 pb-1">
                {eyebrow}
                {titlu}
              </div>
            </div>
          ) : tpl.familie === "indraznet-dinamic" ? (
            <div className="relative aspect-[16/9] w-full overflow-hidden">
              {fotoCampanie ?? heroFallback}
              <div className="absolute inset-x-0 top-0 h-14 origin-top-left -skew-y-3 bg-brand-green/90" />
              {/* Voal întărit (era from-black/80 via-black/30 to-transparent):
                  div-ul se dimensionează după conținut, ancorat jos — textul
                  (mai ales eyebrow-ul, primul rând) ajunge lângă capătul
                  "to-transparent"/"via" de sus, unde fundalul de dedesubt
                  (poză reală SAU heroFallback — pt. Educație, gradient navy→auriu)
                  răzbătea aproape neschimbat, ilizibil cu text alb (~2.3:1
                  contrast măsurat pe auriu). Minim 20% negru chiar și sus. */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/65 to-black/20 px-6 pt-14 pb-5 sm:px-10">
                <Link
                  href={`/strangere-fonduri/${orgSlug}`}
                  className="text-xs font-bold tracking-wide text-white uppercase hover:underline [text-shadow:0_1px_4px_rgba(0,0,0,0.85)]"
                >
                  {t.campaignPage.verificataDe(org.name)}
                </Link>
                <h1 className="font-display mt-1.5 text-[28px] leading-tight font-bold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.85)] sm:text-[32px]">
                  {pagina.titlu}
                </h1>
              </div>
            </div>
          ) : tpl.familie === "elegant-editorial" ? (
            <div className="grid gap-0 sm:grid-cols-[0.85fr_1.15fr]">
              <div className="aspect-[4/3] w-full overflow-hidden sm:aspect-auto sm:h-full">{fotoCampanie ?? heroFallback}</div>
              <div className="flex flex-col justify-center px-6 py-7 sm:px-9 sm:py-9">
                {eyebrow}
                {titlu}
              </div>
            </div>
          ) : tpl.familie === "cald-protector" ? (
            <div className="p-4 pb-0 sm:p-5">
              <div className="aspect-[16/9] w-full overflow-hidden rounded-[var(--radius-card)]">{fotoCampanie ?? heroFallback}</div>
            </div>
          ) : (
            <div className="aspect-[21/9] w-full overflow-hidden">{fotoCampanie ?? heroFallback}</div>
          )}

          <div className="px-6 py-7 sm:px-10 sm:py-9">
            {tpl.familie !== "natural-ancorat" && tpl.familie !== "indraznet-dinamic" && tpl.familie !== "elegant-editorial" && (
              <>
                {eyebrow}
                {titlu}
              </>
            )}

            <div className="mt-5">
              <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">{t.campaignPage.distribuie}</p>
              <ShareLinksClient url={url} titlu={pagina.titlu} locale={locale} />
              <Link
                href={`/strangere-fonduri/${orgSlug}/${pageSlug}/promovare`}
                className="mt-2 inline-block text-[13px] font-medium text-brand-green hover:underline"
              >
                {t.campaignPage.instrumentePromovare}
              </Link>
            </div>

            <div className="mt-7 flex flex-col items-start gap-4 rounded-2xl border border-line bg-panel-2 p-6 sm:flex-row sm:items-center sm:gap-5">
              {procent != null && <ProgressRing procent={procent} />}
              <div className="min-w-0">
                <span className="font-display block text-2xl font-extrabold text-brand-blue sm:text-3xl">
                  {t.campaignPage.leiSuma(pagina.sumaStransa.toLocaleString(t.numeLocale))}
                </span>
                <span className="text-sm text-muted-2">
                  {pagina.sumaTinta && t.campaignPage.dinTinta(pagina.sumaTinta.toLocaleString(t.numeLocale))}
                  {totalDonatii.toLocaleString(t.numeLocale)} {totalDonatii === 1 ? t.campaignPage.donatie : t.campaignPage.donatii}
                </span>
              </div>
            </div>

            {actualizari.length > 0 && (
              <div className="mt-7">
                <h2 className="font-display text-base font-bold text-ink">{t.campaignPage.actualizari}</h2>
                <div className="mt-4 flex flex-col">
                  {actualizari.map((a, i) => (
                    <div key={a.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full bg-brand-green text-white">
                          <span className="text-lg leading-none font-extrabold">{a.data.toLocaleDateString(t.numeLocale, { day: "2-digit" })}</span>
                          <span className="mt-0.5 text-[10px] leading-none font-bold uppercase">
                            {a.data.toLocaleDateString(t.numeLocale, { month: "short" }).replace(".", "")}
                          </span>
                        </div>
                        {i < actualizari.length - 1 && <div className="my-1 w-0.5 flex-1 bg-brand-green-soft" />}
                      </div>
                      <div className="mb-5 min-w-0 flex-1 rounded-2xl border border-line bg-panel-2 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-display text-sm font-bold text-ink">{a.titlu}</p>
                          <span className="shrink-0 text-xs text-muted-2">
                            {a.data.toLocaleDateString(t.numeLocale, { day: "numeric", month: "long", year: "numeric" })}
                          </span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-body">{a.continut}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-6 sm:grid-cols-[260px_minmax(0,1fr)]">
              <div className="h-fit rounded-2xl border border-brand-green-soft bg-brand-green-soft/60 p-5">
                <p className="font-display text-sm font-bold text-ink">{t.campaignPage.sustineCampania}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-2">{t.campaignPage.sustineDescriere}</p>
                <div className="mt-4">
                  {pagina.status === "activa" ? (
                    <DoneazaModal
                      orgSlug={orgSlug}
                      pageSlug={pageSlug}
                      titlu={pagina.titlu}
                      locale={locale}
                      publishableKey={org.donationStripePublishableKey}
                    />
                  ) : (
                    <p className="text-[13px] leading-relaxed text-muted-2">{t.campaignPage.campanieInchisa}</p>
                  )}
                </div>
                <RecentDonationsList donatii={recente} locale={locale} />
              </div>

              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-body">{pagina.poveste}</p>
            </div>
          </div>
        </div>

        {(topDonatori.length > 0 || recente.length > 0) && (
          <section id="toate-donatiile" className="mt-8 grid scroll-mt-6 gap-6 rounded-3xl border border-line bg-panel p-6 shadow-sm sm:grid-cols-2 sm:p-8">
            {topDonatori.length > 0 && (
              <div>
                <h2 className="font-display text-base font-bold text-ink">{t.campaignPage.topDonatori}</h2>
                <div className="mt-4 flex flex-col gap-2">
                  {topDonatori.map((d, i) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border border-line bg-panel-2 px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-display text-sm font-extrabold text-brand-green">#{i + 1}</span>
                        <span className="text-sm font-medium text-ink">
                          {d.anonim || !d.numeDonator ? t.campaignPage.susinatorAnonim : d.numeDonator}
                        </span>
                      </div>
                      <span className="ci-tabular text-sm font-bold text-brand-blue">
                        {t.campaignPage.leiSuma(d.suma.toLocaleString(t.numeLocale))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recente.length > 0 && (
              <div>
                <h2 className="font-display text-base font-bold text-ink">{t.campaignPage.donatiiRecente}</h2>
                <div className="mt-4 flex flex-col gap-3">
                  {recente.map((d) => (
                    <div key={d.id} className="rounded-lg border border-line bg-panel-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-ink">
                          {d.anonim || !d.numeDonator ? t.campaignPage.susinatorAnonim : d.numeDonator}
                        </span>
                        <span className="ci-tabular text-sm font-bold text-brand-blue">
                          {t.campaignPage.leiSuma(d.suma.toLocaleString(t.numeLocale))}
                        </span>
                      </div>
                      {d.mesaj && <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{d.mesaj}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {alteCampanii.length > 0 && (
          <section className="mt-8">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-base font-bold text-ink">{t.campaignPage.alteCampanii(org.name)}</h2>
              <Link href={`/strangere-fonduri/${orgSlug}`} className="shrink-0 text-[13px] font-medium text-brand-green hover:underline">
                {t.campaignPage.vezToate}
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {alteCampanii.map((p) => {
                const procentAlta = p.sumaTinta ? Math.min(100, Math.round((p.sumaStransa / p.sumaTinta) * 100)) : null;
                return (
                  <Link
                    key={p.id}
                    href={`/strangere-fonduri/${orgSlug}/${p.slug}`}
                    data-domeniu={p.template}
                    className="group flex items-center gap-4 overflow-hidden rounded-2xl border border-line bg-panel p-3 shadow-sm transition hover:shadow-[0_14px_36px_-18px_rgba(21,74,133,0.35)]"
                  >
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-brand-blue to-brand-green">
                      {p.imagineUrl && (
                        // eslint-disable-next-line @next/next/no-img-element -- domeniu Supabase Storage dinamic
                        <img src={p.imagineUrl} alt={p.titlu} className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-display truncate text-[14px] font-bold text-ink">{p.titlu}</p>
                      <p className="mt-0.5 text-[12.5px] text-muted-2">
                        {t.campaignPage.leiSuma(p.sumaStransa.toLocaleString(t.numeLocale))}
                        {p.sumaTinta && ` ${t.campaignPage.dinTintaScurt(p.sumaTinta.toLocaleString(t.numeLocale))}`}
                        {procentAlta != null && ` · ${procentAlta}%`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </main>

      <CampaignFooter orgSlug={orgSlug} orgName={org.name} orgLogoUrl={org.logoUrl} orgSlogan={org.slogan} orgCif={org.cif} locale={locale} />
    </div>
  );
}
