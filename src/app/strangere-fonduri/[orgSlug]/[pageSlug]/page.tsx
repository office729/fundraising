import { and, desc, eq, sql } from "drizzle-orm";
import { ArrowLeft, CalendarDays, Heart, Lock, MapPin } from "lucide-react";
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
import { caleCampanie } from "@/lib/link-campanie";
import { FARA_METODE_REDIRECT, metodeRedirect } from "@/lib/metode-plata-donatii";

import { aziRo, zileRamase } from "@/app/(app)/[orgSlug]/crm/strangere-fonduri/campanie-validare";

import { CampaignFooter } from "../campaign-footer";
import { BaraDoneazaMobil } from "./bara-doneaza-mobil";
import { DoneazaModal } from "./doneaza-modal";
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

    // Cele cinci citiri sunt independente: rulează împreună pe aceeași conexiune (pipelining), nu una după alta.
    const [recente, topDonatori, actualizari, [{ totalDonatii }], alteCampanii] = await Promise.all([
      tx
        .select(COLOANE_DONATIE_PUBLICA)
        .from(fundraisingDonations)
        .where(and(eq(fundraisingDonations.pageId, pagina[0].id), eq(fundraisingDonations.status, "reusita")))
        .orderBy(desc(fundraisingDonations.createdAt))
        .limit(20),
      tx
        .select(COLOANE_DONATIE_PUBLICA)
        .from(fundraisingDonations)
        .where(and(eq(fundraisingDonations.pageId, pagina[0].id), eq(fundraisingDonations.status, "reusita")))
        .orderBy(desc(fundraisingDonations.suma))
        .limit(5),
      tx.select().from(fundraisingUpdates).where(eq(fundraisingUpdates.pageId, pagina[0].id)).orderBy(desc(fundraisingUpdates.data)),
      tx
        .select({ totalDonatii: sql<number>`count(*)::int` })
        .from(fundraisingDonations)
        .where(and(eq(fundraisingDonations.pageId, pagina[0].id), eq(fundraisingDonations.status, "reusita"))),
      // Alte campanii active ale aceleiași organizații — link către
      // /strangere-fonduri/[orgSlug] (hub-ul organizației) pentru restul.
      tx
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
        .limit(3),
    ]);

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
  // Fără rupturi de rând în descriere (apăreau în previzualizări ca text, nu ca spațiu).
  const poveste = pagina.poveste.replace(/\s+/g, " ").trim();
  const descriere = poveste.length > 160 ? `${poveste.slice(0, 157)}...` : poveste;
  const adresa = caleCampanie(orgSlug, pageSlug);
  // Pagina care se distribuie pe WhatsApp/Facebook: fără `og:image` linkul apărea fără imagine, deși pagina are una.
  const imagini = pagina.imagineUrl ? [{ url: pagina.imagineUrl }] : undefined;

  return {
    title: `${pagina.titlu} — ${org.name}`,
    description: descriere,
    alternates: { canonical: adresa },
    openGraph: { title: pagina.titlu, description: descriere, type: "website", url: adresa, images: imagini },
    twitter: { card: imagini ? "summary_large_image" : "summary", title: pagina.titlu, description: descriere, images: imagini?.map((i) => i.url) },
  };
}

export default async function PaginaStrangereFonduriPage({
  params,
}: {
  params: Promise<{ orgSlug: string; pageSlug: string }>;
}) {
  const { orgSlug, pageSlug } = await params;
  // Metodele cu redirect (Revolut/PayPal) se verifică în paralel cu încărcarea paginii.
  const [data, locale, metode] = await Promise.all([getPaginaPublica(orgSlug, pageSlug), getLocale(), metodeRedirect(orgSlug)]);
  if (!data) notFound();
  const t = DONATION_DICT[locale];
  const c = t.campaignPage;

  const { org, pagina, recente, topDonatori, actualizari, totalDonatii, alteCampanii } = data;
  const procent = pagina.sumaTinta ? Math.min(100, Math.round((pagina.sumaStransa / pagina.sumaTinta) * 100)) : null;
  const tpl = CAMPAIGN_TEMPLATES[pagina.template];
  const activa = pagina.status === "activa";
  // Header "origin" nu e trimis pe navigare GET simplă (doar pe fetch/POST
  // cross-origin) — construim din host + protocolul reținut de proxy-ul Vercel.
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const url = `${proto}://${hdrs.get("host")}${caleCampanie(orgSlug, pageSlug)}`;

  // Povestea se citește pe paragrafe (rând liber între ele); rândurile simple din interiorul unui paragraf se păstrează.
  const paragrafe = pagina.poveste.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  // „Suceava, Suceava” (localitate = județ) se afișează o singură dată.
  const loc = [...new Set([pagina.localitate?.trim(), pagina.judet?.trim()].filter(Boolean))].join(", ");
  const termenText = pagina.termen
    ? c.termen(new Date(`${pagina.termen}T12:00:00`).toLocaleDateString(t.numeLocale, { day: "numeric", month: "long", year: "numeric" }), zileRamase(pagina.termen, aziRo()))
    : null;
  const sumaText = c.leiSuma(pagina.sumaStransa.toLocaleString(t.numeLocale));
  const donatiiText = `${totalDonatii.toLocaleString(t.numeLocale)} ${totalDonatii === 1 ? c.donatie : c.donatii}`;

  const logoOrg = org.logoUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- domeniu Supabase Storage dinamic
    <img src={org.logoUrl} alt="" className="h-full w-full object-contain" />
  ) : null;

  // Copertă: poza campaniei, sau — dacă organizația nu a încărcat una — un fundal în culorile domeniului cu sigla organizației.
  const coperta = pagina.imagineUrl ? (
    // eslint-disable-next-line @next/next/no-img-element -- domeniu Supabase Storage dinamic
    <img src={pagina.imagineUrl} alt={pagina.titlu} className="h-full w-full object-cover" fetchPriority="high" />
  ) : (
    <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br from-brand-blue to-brand-green" aria-hidden="true">
      <span className="absolute -top-16 -right-16 h-64 w-64 rounded-full bg-white/10" />
      <span className="absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-black/10" />
      <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-white p-4 shadow-lg sm:h-28 sm:w-28">
        {logoOrg ?? <Heart className="h-10 w-10 text-brand-green" />}
      </span>
    </div>
  );

  const cardDonatie = (
    <div id="sustine-campania" className="scroll-mt-6 rounded-2xl border border-line bg-panel p-5 shadow-[0_18px_40px_-24px_rgba(21,74,133,0.45)] sm:p-6">
      <p className="font-display text-[34px] leading-none font-extrabold text-ink">{sumaText}</p>
      <p className="mt-1.5 text-[14px] text-muted-2">
        {pagina.sumaTinta ? c.stransDin(pagina.sumaTinta.toLocaleString(t.numeLocale)) : c.stransPanaAcum}
      </p>

      {procent != null && (
        <div className="mt-4">
          <div className="h-3 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={procent} aria-valuemin={0} aria-valuemax={100} aria-label={c.procentDinTinta(procent)}>
            <div className="h-full rounded-full bg-brand-green transition-[width] duration-700" style={{ width: `${Math.max(procent, procent > 0 ? 2 : 0)}%` }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[13px] text-muted-2">
            <span className="font-bold text-ink">{c.procentDinTinta(procent)}</span>
            <span>{donatiiText}</span>
          </div>
        </div>
      )}
      {procent == null && <p className="mt-3 text-[13px] text-muted-2">{donatiiText}</p>}
      {termenText && (
        <p className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-brand-blue">
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" /> {termenText}
        </p>
      )}

      <div className="mt-5">
        {activa ? (
          <>
            <DoneazaModal
              orgSlug={orgSlug}
              pageSlug={pageSlug}
              titlu={pagina.titlu}
              locale={locale}
              publishableKey={org.donationStripePublishableKey}
              metode={org.donationStripePublishableKey ? metode : FARA_METODE_REDIRECT}
              orgName={org.name}
              orgCif={org.cif}
            />
            <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-relaxed text-muted-2">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>{c.sustineDescriere}</span>
            </p>
          </>
        ) : (
          <p className="rounded-lg bg-panel-2 px-4 py-3 text-[14px] leading-relaxed text-muted-2">{c.campanieInchisa}</p>
        )}
      </div>

      {recente.length > 0 ? (
        <RecentDonationsList donatii={recente} locale={locale} total={totalDonatii} />
      ) : (
        activa && <p className="mt-5 border-t border-line pt-4 text-[13px] leading-relaxed text-muted-2">{t.recentList.nicioDonatie}</p>
      )}

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">{c.distribuie}</p>
        <ShareLinksClient url={url} titlu={pagina.titlu} locale={locale} />
        <Link href={`/strangere-fonduri/${orgSlug}/${pageSlug}/promovare`} className="mt-3 inline-block text-[13px] font-medium text-brand-green hover:underline">
          {c.instrumentePromovare}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-blue-soft/70 via-panel-2 to-panel-2" data-domeniu={pagina.template}>
      <a href="#sustine-campania" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-panel focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-ink focus:shadow-lg">
        {c.sariLaDonatie}
      </a>
      <main className="mx-auto max-w-6xl px-4 pt-5 pb-16 sm:px-6 sm:pt-8">
        <Link href={`/strangere-fonduri/${orgSlug}`} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-muted-2 transition hover:text-brand-blue">
          <ArrowLeft className="h-3.5 w-3.5" /> {c.acasaLa(org.name)}
        </Link>

        <div className="mt-4 grid gap-x-10 gap-y-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Copertă + titlu */}
          <div className="min-w-0 lg:col-start-1">
            <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl border border-line bg-panel shadow-sm sm:aspect-[16/9]">
              {coperta}
              {(tpl.familie !== "neutru" || !activa) && (
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  {tpl.familie !== "neutru" && <span className="rounded-full bg-white/95 px-3 py-1 text-[12px] font-bold text-ink shadow-sm">{tpl.nume}</span>}
                  {!activa && <span className="rounded-full bg-ink/90 px-3 py-1 text-[12px] font-bold text-white shadow-sm">{c.campaniaInchisa}</span>}
                </div>
              )}
            </div>

            <div className="mt-6">
              <Link href={`/strangere-fonduri/${orgSlug}`} className="inline-flex items-center gap-2.5 text-[13.5px] text-muted-2 hover:text-brand-blue">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-white p-0.5">{logoOrg ?? <Heart className="h-3.5 w-3.5 text-brand-green" />}</span>
                <span>
                  {c.organizator}: <b className="font-semibold text-ink">{org.name}</b>
                </span>
              </Link>
              <h1 className="font-display mt-3 text-[30px] leading-[1.15] font-extrabold text-balance text-ink sm:text-[40px]">{pagina.titlu}</h1>
              {loc && (
                <p className="mt-3 flex items-center gap-1.5 text-[14px] text-muted-2">
                  <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" /> {loc}
                </p>
              )}
            </div>
          </div>

          {/* Donație: pe telefon vine imediat după titlu, pe calculator stă fixată în dreapta */}
          <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start lg:sticky lg:top-6" aria-label={c.sustineCampania}>
            {cardDonatie}
          </aside>

          {/* Poveste, actualizări, organizator */}
          <div className="min-w-0 space-y-8 lg:col-start-1">
            <section className="rounded-2xl border border-line bg-panel p-6 shadow-sm sm:p-9">
              <h2 className="font-display text-[22px] font-extrabold text-ink">{c.povestea}</h2>
              <div className="mt-5 max-w-[68ch] space-y-5 text-[17px] leading-[1.8] text-body">
                {paragrafe.map((p, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {p}
                  </p>
                ))}
              </div>
            </section>

            {actualizari.length > 0 && (
              <section className="rounded-2xl border border-line bg-panel p-6 shadow-sm sm:p-9">
                <h2 className="font-display text-[22px] font-extrabold text-ink">{c.actualizari}</h2>
                <div className="mt-6 flex flex-col">
                  {actualizari.map((a, i) => (
                    <div key={a.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-full bg-brand-green text-white">
                          <span className="text-lg leading-none font-extrabold">{a.data.toLocaleDateString(t.numeLocale, { day: "2-digit" })}</span>
                          <span className="mt-0.5 text-[10px] leading-none font-bold uppercase">{a.data.toLocaleDateString(t.numeLocale, { month: "short" }).replace(".", "")}</span>
                        </div>
                        {i < actualizari.length - 1 && <div className="my-1 w-0.5 flex-1 bg-brand-green-soft" />}
                      </div>
                      <div className="mb-5 min-w-0 flex-1 rounded-2xl border border-line bg-panel-2 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-display text-[15px] font-bold text-ink">{a.titlu}</p>
                          <span className="shrink-0 text-xs text-muted-2">{a.data.toLocaleDateString(t.numeLocale, { day: "numeric", month: "long", year: "numeric" })}</span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap text-[14.5px] leading-relaxed text-body">{a.continut}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-line bg-panel p-6 shadow-sm sm:p-8">
              <h2 className="font-display text-[22px] font-extrabold text-ink">{c.despreOrganizator}</h2>
              <div className="mt-5 flex items-start gap-4">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-white p-1.5">{logoOrg ?? <Heart className="h-6 w-6 text-brand-green" />}</span>
                <div className="min-w-0">
                  <p className="font-display text-[18px] font-bold text-ink">{org.name}</p>
                  {org.slogan && <p className="mt-0.5 text-[14.5px] text-body">{org.slogan}</p>}
                  {org.cif && (
                    <p className="mt-1 text-[13px] text-muted-2">
                      {c.cif} {org.cif}
                    </p>
                  )}
                  <Link href={`/strangere-fonduri/${orgSlug}`} className="mt-3 inline-block text-[13.5px] font-semibold text-brand-green hover:underline">
                    {c.toateCampaniile}
                  </Link>
                </div>
              </div>
            </section>
          </div>
        </div>

        {(topDonatori.length > 0 || recente.length > 0) && (
          <section id="toate-donatiile" className="mt-8 grid scroll-mt-6 gap-6 rounded-3xl border border-line bg-panel p-6 shadow-sm sm:grid-cols-2 sm:p-8">
            {topDonatori.length > 0 && (
              <div>
                <h2 className="font-display text-base font-bold text-ink">{c.topDonatori}</h2>
                <div className="mt-4 flex flex-col gap-2">
                  {topDonatori.map((d, i) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border border-line bg-panel-2 px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-display text-sm font-extrabold text-brand-green">#{i + 1}</span>
                        <span className="text-sm font-medium text-ink">{d.anonim || !d.numeDonator ? c.susinatorAnonim : d.numeDonator}</span>
                      </div>
                      <span className="ci-tabular text-sm font-bold text-brand-blue">{c.leiSuma(d.suma.toLocaleString(t.numeLocale))}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recente.length > 0 && (
              <div>
                <h2 className="font-display text-base font-bold text-ink">{c.donatiiRecente}</h2>
                <div className="mt-4 flex flex-col gap-3">
                  {recente.map((d) => (
                    <div key={d.id} className="rounded-lg border border-line bg-panel-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-ink">{d.anonim || !d.numeDonator ? c.susinatorAnonim : d.numeDonator}</span>
                        <span className="ci-tabular text-sm font-bold text-brand-blue">{c.leiSuma(d.suma.toLocaleString(t.numeLocale))}</span>
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
          <section className="mt-10">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-[20px] font-extrabold text-ink">{c.alteCampanii(org.name)}</h2>
              <Link href={`/strangere-fonduri/${orgSlug}`} className="shrink-0 text-[13px] font-medium text-brand-green hover:underline">
                {c.vezToate}
              </Link>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                        {c.leiSuma(p.sumaStransa.toLocaleString(t.numeLocale))}
                        {p.sumaTinta && ` ${c.dinTintaScurt(p.sumaTinta.toLocaleString(t.numeLocale))}`}
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

      {activa && (
        <BaraDoneazaMobil
          tintaId="sustine-campania"
          eticheta={t.donateModal.donezaAcum}
          rezumat={pagina.sumaTinta ? `${sumaText} · ${c.stransDin(pagina.sumaTinta.toLocaleString(t.numeLocale))}` : `${sumaText} ${c.stransPanaAcum}`}
          procent={procent}
        />
      )}

      <CampaignFooter orgSlug={orgSlug} orgName={org.name} orgLogoUrl={org.logoUrl} orgSlogan={org.slogan} orgCif={org.cif} locale={locale} />
    </div>
  );
}
