import { and, desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";

import { db } from "@/lib/db";
import { fundraisingDonations, fundraisingPages, fundraisingUpdates, organizations } from "@/lib/db/schema";

import { DoneazaModal } from "./doneaza-modal";
import { PaymentBadges } from "./payment-badges";
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
    const org = await tx.select({ id: organizations.id, name: organizations.name }).from(organizations).where(eq(organizations.slug, orgSlug)).limit(1);
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
      .orderBy(desc(fundraisingUpdates.createdAt));

    const [{ totalDonatii }] = await tx
      .select({ totalDonatii: sql<number>`count(*)::int` })
      .from(fundraisingDonations)
      .where(and(eq(fundraisingDonations.pageId, pagina[0].id), eq(fundraisingDonations.status, "reusita")));

    return { org: org[0], pagina: pagina[0], recente, topDonatori, actualizari, totalDonatii };
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
  const data = await getPaginaPublica(orgSlug, pageSlug);
  if (!data) notFound();

  const { org, pagina, recente, topDonatori, actualizari, totalDonatii } = data;
  const procent = pagina.sumaTinta ? Math.min(100, Math.round((pagina.sumaStransa / pagina.sumaTinta) * 100)) : null;
  // Header "origin" nu e trimis pe navigare GET simplă (doar pe fetch/POST
  // cross-origin) — construim din host + protocolul reținut de proxy-ul Vercel.
  const hdrs = await headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const url = `${proto}://${hdrs.get("host")}/strangere-fonduri/${orgSlug}/${pageSlug}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-blue-soft/70 via-panel-2 to-panel-2">
      <main className="mx-auto max-w-3xl px-6 py-12 sm:py-16">
        <div className="overflow-hidden rounded-3xl border border-line bg-panel shadow-[0_20px_50px_-25px_rgba(21,74,133,0.35)]">
          {pagina.imagineUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- domeniu Supabase Storage dinamic
            <img src={pagina.imagineUrl} alt={pagina.titlu} className="aspect-[16/9] w-full object-cover" />
          ) : (
            <div className="aspect-[21/9] w-full bg-gradient-to-br from-brand-blue to-brand-green" />
          )}

          <div className="px-6 py-7 sm:px-10 sm:py-9">
            <p className="text-xs font-bold tracking-wide text-brand-green uppercase">Campanie verificată de {org.name}</p>
            <h1 className="font-display mt-1.5 text-[30px] leading-tight font-bold text-ink">{pagina.titlu}</h1>

            <div className="mt-5">
              <p className="text-xs font-semibold tracking-wide text-muted-2 uppercase">Distribuie această campanie</p>
              <ShareLinksClient url={url} titlu={pagina.titlu} />
            </div>

            <div className="mt-7 flex flex-col items-start gap-4 rounded-2xl border border-line bg-panel-2 p-6 sm:flex-row sm:items-center sm:gap-5">
              {procent != null && <ProgressRing procent={procent} />}
              <div className="min-w-0">
                <span className="font-display block text-2xl font-extrabold text-brand-blue sm:text-3xl">
                  {pagina.sumaStransa.toLocaleString("ro-RO")} lei
                </span>
                <span className="text-sm text-muted-2">
                  {pagina.sumaTinta && `din ${pagina.sumaTinta.toLocaleString("ro-RO")} lei · `}
                  {totalDonatii.toLocaleString("ro-RO")} {totalDonatii === 1 ? "donație" : "donații"}
                </span>
              </div>
            </div>

            <div className="mt-6 grid gap-6 sm:grid-cols-[260px_minmax(0,1fr)]">
              <div className="h-fit rounded-2xl border border-brand-green-soft bg-brand-green-soft/60 p-5">
                <p className="font-display text-sm font-bold text-ink">Susține campania</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-muted-2">
                  Orice sumă contează — plata e securizată, procesată de Stripe.
                </p>
                <div className="mt-4">
                  {pagina.status === "activa" ? (
                    <DoneazaModal orgSlug={orgSlug} pageSlug={pageSlug} titlu={pagina.titlu} />
                  ) : (
                    <p className="text-[13px] leading-relaxed text-muted-2">
                      Această campanie este închisă și nu mai acceptă donații noi.
                    </p>
                  )}
                </div>
                <div className="mt-4">
                  <PaymentBadges />
                </div>
                <RecentDonationsList donatii={recente} />
              </div>

              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-body">{pagina.poveste}</p>
            </div>
          </div>
        </div>

        {actualizari.length > 0 && (
          <section className="mt-8 rounded-3xl border border-line bg-panel p-6 shadow-sm sm:p-8">
            <h2 className="font-display text-base font-bold text-ink">Actualizări</h2>
            <div className="mt-4 flex flex-col gap-3">
              {actualizari.map((a) => (
                <div key={a.id} className="rounded-2xl border border-line bg-panel-2 p-5">
                  <p className="text-[13px] font-bold text-ink">{a.titlu}</p>
                  <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-body">{a.continut}</p>
                  <p className="mt-2 text-xs text-muted-2">
                    {a.createdAt.toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {(topDonatori.length > 0 || recente.length > 0) && (
          <section id="toate-donatiile" className="mt-8 grid scroll-mt-6 gap-6 rounded-3xl border border-line bg-panel p-6 shadow-sm sm:grid-cols-2 sm:p-8">
            {topDonatori.length > 0 && (
              <div>
                <h2 className="font-display text-base font-bold text-ink">Top donatori</h2>
                <div className="mt-4 flex flex-col gap-2">
                  {topDonatori.map((d, i) => (
                    <div key={d.id} className="flex items-center justify-between rounded-lg border border-line bg-panel-2 px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="font-display text-sm font-extrabold text-brand-green">#{i + 1}</span>
                        <span className="text-sm font-medium text-ink">{d.anonim || !d.numeDonator ? "Susținător anonim" : d.numeDonator}</span>
                      </div>
                      <span className="ci-tabular text-sm font-bold text-brand-blue">{d.suma.toLocaleString("ro-RO")} lei</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {recente.length > 0 && (
              <div>
                <h2 className="font-display text-base font-bold text-ink">Donații recente</h2>
                <div className="mt-4 flex flex-col gap-3">
                  {recente.map((d) => (
                    <div key={d.id} className="rounded-lg border border-line bg-panel-2 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-ink">{d.anonim || !d.numeDonator ? "Susținător anonim" : d.numeDonator}</span>
                        <span className="ci-tabular text-sm font-bold text-brand-blue">{d.suma.toLocaleString("ro-RO")} lei</span>
                      </div>
                      {d.mesaj && <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{d.mesaj}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
